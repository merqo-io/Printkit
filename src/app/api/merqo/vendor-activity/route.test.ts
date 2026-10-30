import { describe, it, expect, beforeEach, vi } from "vitest";
import { vendorActivityPayloadSchema } from "@merqo/ui/contracts";

const { fromMock, listUsersMock, summarizeMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  listUsersMock: vi.fn(),
  summarizeMock: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(async () => ({
    from: fromMock,
    auth: { admin: { listUsers: listUsersMock } },
  })),
}));
vi.mock("@/lib/ops-events", () => ({
  summarizeIncidents: (...args: unknown[]) => summarizeMock(...args),
}));

import { GET } from "./route";

type Result = {
  data?: unknown;
  count?: number | null;
  error: { message: string } | null;
};

// Chainable stand-in that picks its result from the filters the route applied.
function query(pick: (calls: unknown[][]) => Result) {
  const calls: unknown[][] = [];
  const q: Record<string, unknown> = {};
  for (const m of ["select", "eq", "gte", "order", "limit"]) {
    q[m] = (...args: unknown[]) => {
      calls.push([m, ...args]);
      return q;
    };
  }
  q.maybeSingle = () => {
    calls.push(["maybeSingle"]);
    return Promise.resolve(pick(calls));
  };
  q.then = (resolve: (r: Result) => unknown) =>
    Promise.resolve(pick(calls)).then(resolve);
  return q;
}

function mockTables(o: {
  printers?: Result;
  jobs?: Result;
  failed?: Result;
  last?: Result;
}) {
  fromMock.mockImplementation((table: string) => {
    if (table === "printers")
      return query(() => o.printers ?? { count: 0, error: null });
    if (table === "print_jobs")
      return query((calls) => {
        if (calls.some((c) => c[0] === "maybeSingle"))
          return o.last ?? { data: null, error: null };
        if (calls.some((c) => c[0] === "eq" && c[1] === "status"))
          return o.failed ?? { count: 0, error: null };
        return o.jobs ?? { count: 0, error: null };
      });
    throw new Error(`unexpected table ${table}`);
  });
}

function req(url: string, auth?: string) {
  return new Request(url, { headers: auth ? { Authorization: auth } : {} });
}
const URL_OK =
  "http://localhost/api/merqo/vendor-activity?email=Vendor@Business.sg";

describe("GET /api/merqo/vendor-activity (printkit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MERQO_METRICS_SECRET = "test-secret";
    listUsersMock.mockResolvedValue({
      data: { users: [{ id: "u1", email: "vendor@business.sg" }] },
      error: null,
    });
    summarizeMock.mockResolvedValue({ incidents: [], recent: [] });
    mockTables({});
  });

  it("401 without the bearer", async () => {
    expect((await GET(req(URL_OK))).status).toBe(401);
    expect(listUsersMock).not.toHaveBeenCalled();
  });

  it("401 with a wrong bearer", async () => {
    expect((await GET(req(URL_OK, "Bearer nope"))).status).toBe(401);
  });

  it("400 without a valid email", async () => {
    const res = await GET(
      req("http://localhost/api/merqo/vendor-activity", "Bearer test-secret"),
    );
    expect(res.status).toBe(400);
  });

  it("404 for an unknown email", async () => {
    listUsersMock.mockResolvedValue({ data: { users: [] }, error: null });
    expect((await GET(req(URL_OK, "Bearer test-secret"))).status).toBe(404);
  });

  it("503 when the user listing fails", async () => {
    listUsersMock.mockResolvedValue({ data: null, error: { message: "x" } });
    expect((await GET(req(URL_OK, "Bearer test-secret"))).status).toBe(503);
  });

  it("returns stats with incidents and recent that parse against the contract", async () => {
    mockTables({
      printers: { count: 1, error: null },
      jobs: { count: 10, error: null },
      failed: { count: 3, error: null },
      last: { data: { created_at: "2026-10-29T10:00:00.000Z" }, error: null },
    });
    summarizeMock.mockResolvedValue({
      incidents: [
        { kind: "print_failed", count: 3, lastAt: "2026-10-29T09:00:00.000Z" },
      ],
      recent: [
        {
          kind: "print_failed",
          ref: "job-1",
          code: "printer_offline",
          at: "2026-10-29T09:00:00.000Z",
        },
      ],
    });

    const res = await GET(req(URL_OK, "Bearer test-secret"));
    expect(res.status).toBe(200);
    const body = vendorActivityPayloadSchema.parse(await res.json());
    expect(body.active).toBe(true);
    expect(body.status).toBe("attention");
    expect(body.lastActivityAt).toBe("2026-10-29T10:00:00.000Z");
    expect(body.metrics).toContainEqual({
      label: "Failure rate (30d)",
      value: "30%",
    });
    expect(body.incidents).toHaveLength(1);
    expect(body.recent?.[0].ref).toBe("job-1");
    expect(summarizeMock).toHaveBeenCalledWith(
      expect.anything(),
      "u1",
      72,
      expect.any(Number),
    );
  });

  it("returns a known vendor with nothing set up as inactive", async () => {
    const res = await GET(req(URL_OK, "Bearer test-secret"));
    const body = vendorActivityPayloadSchema.parse(await res.json());
    expect(body).toMatchObject({ active: false, status: null, metrics: [] });
  });

  it("still answers without incidents when the incident read fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    summarizeMock.mockRejectedValue(new Error("ops_events read failed"));
    mockTables({ printers: { count: 1, error: null } });

    const res = await GET(req(URL_OK, "Bearer test-secret"));
    expect(res.status).toBe(200);
    const body = vendorActivityPayloadSchema.parse(await res.json());
    expect(body.incidents).toBeUndefined();
    expect(body.status).toBe("new");
  });

  it("503 when a stats read fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockTables({ jobs: { count: null, error: { message: "down" } } });
    expect((await GET(req(URL_OK, "Bearer test-secret"))).status).toBe(503);
  });
});
