import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  recordOpsEvent,
  summarizeIncidents,
  type ServiceClient,
} from "./ops-events";

type Result = {
  data: unknown;
  error: { message: string; code?: string } | null;
};

// Chainable query stand-in: every builder call returns itself; awaiting resolves `result`.
function query(result: Result, calls: unknown[][] = []) {
  const q: Record<string, unknown> = {};
  for (const m of ["select", "eq", "in", "gte", "lt", "order", "limit"]) {
    q[m] = (...args: unknown[]) => {
      calls.push([m, ...args]);
      return q;
    };
  }
  q.then = (resolve: (r: Result) => unknown) =>
    Promise.resolve(result).then(resolve);
  return q;
}

function client(tables: Record<string, unknown>) {
  return {
    from: (t: string) => {
      if (!(t in tables)) throw new Error(`unexpected table ${t}`);
      return tables[t];
    },
  } as unknown as ServiceClient;
}

describe("recordOpsEvent", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => errorSpy.mockRestore());

  it("inserts the row", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    await recordOpsEvent(client({ ops_events: { insert } }), {
      vendorId: "v1",
      kind: "print_failed",
      ref: "job-1",
      code: "expired",
    });
    expect(insert).toHaveBeenCalledWith({
      vendor_id: "v1",
      kind: "print_failed",
      ref: "job-1",
      code: "expired",
    });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("truncates ref and code to 64 characters", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    await recordOpsEvent(client({ ops_events: { insert } }), {
      vendorId: "v1",
      kind: "webhook_rejected",
      ref: "r".repeat(80),
      code: "c".repeat(80),
    });
    const row = insert.mock.calls[0][0] as { ref: string; code: string };
    expect(row.ref).toHaveLength(64);
    expect(row.code).toHaveLength(64);
  });

  it("resolves and logs when the insert returns an error", async () => {
    const insert = vi
      .fn()
      .mockResolvedValue({ error: { message: "down", code: "PGRST000" } });
    await expect(
      recordOpsEvent(client({ ops_events: { insert } }), {
        vendorId: "v1",
        kind: "print_failed",
        ref: "job-1",
        code: "expired",
      }),
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(
      "ops_events insert failed",
      "PGRST000",
    );
  });

  it("resolves and logs when the client throws", async () => {
    const insert = vi.fn(() => {
      throw new Error("socket closed");
    });
    await expect(
      recordOpsEvent(client({ ops_events: { insert } }), {
        vendorId: "v1",
        kind: "print_failed",
        ref: "job-1",
        code: "expired",
      }),
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(
      "ops_events insert failed",
      "exception",
    );
  });
});

describe("summarizeIncidents", () => {
  const now = Date.parse("2026-10-29T12:00:00.000Z");

  it("groups by kind with counts and lastAt, merging computed stuck jobs", async () => {
    const opsCalls: unknown[][] = [];
    const supabase = client({
      ops_events: query(
        {
          data: [
            {
              kind: "print_failed",
              ref: "j3",
              code: "expired",
              created_at: "2026-10-29T11:00:00.000Z",
            },
            {
              kind: "webhook_rejected",
              ref: "j9",
              code: "signature_invalid",
              created_at: "2026-10-29T10:00:00.000Z",
            },
            {
              kind: "print_failed",
              ref: "j2",
              code: "printer_offline",
              created_at: "2026-10-28T09:00:00.000Z",
            },
          ],
          error: null,
        },
        opsCalls,
      ),
      print_jobs: query({
        data: [
          {
            id: "q1",
            status: "queued",
            created_at: "2026-10-29T11:30:00.000Z",
            sent_at: null,
            requeued_at: null,
          },
          {
            id: "s1",
            status: "sent",
            created_at: "2026-10-29T11:00:00.000Z",
            sent_at: "2026-10-29T11:55:00.000Z",
            requeued_at: null,
          },
          {
            id: "s2",
            status: "sent",
            created_at: "2026-10-29T10:00:00.000Z",
            sent_at: "2026-10-29T11:40:00.000Z",
            requeued_at: null,
          },
        ],
        error: null,
      }),
    });

    const out = await summarizeIncidents(supabase, "v1", 72, now);

    expect(opsCalls).toContainEqual(["eq", "vendor_id", "v1"]);
    expect(opsCalls).toContainEqual([
      "gte",
      "created_at",
      "2026-10-26T12:00:00.000Z",
    ]);
    expect(out.incidents).toEqual([
      { kind: "print_stuck", count: 2, lastAt: "2026-10-29T11:40:00.000Z" },
      { kind: "print_failed", count: 2, lastAt: "2026-10-29T11:00:00.000Z" },
      {
        kind: "webhook_rejected",
        count: 1,
        lastAt: "2026-10-29T10:00:00.000Z",
      },
    ]);
    expect(out.recent.map((r) => r.ref)).toEqual([
      "s2",
      "q1",
      "j3",
      "j9",
      "j2",
    ]);
    expect(out.recent[0]).toEqual({
      kind: "print_stuck",
      ref: "s2",
      code: "not_confirmed",
      at: "2026-10-29T11:40:00.000Z",
    });
    expect(out.recent[1].code).toBe("not_claimed");
  });

  it("uses requeued_at as the start of a requeued queued job's wait", async () => {
    const supabase = client({
      ops_events: query({ data: [], error: null }),
      print_jobs: query({
        data: [
          {
            id: "r1",
            status: "queued",
            created_at: "2026-10-29T09:00:00.000Z",
            sent_at: null,
            requeued_at: "2026-10-29T11:58:00.000Z",
          },
        ],
        error: null,
      }),
    });
    const out = await summarizeIncidents(supabase, "v1", 72, now);
    expect(out).toEqual({ incidents: [], recent: [] });
  });

  it("caps recent at 10, newest first", async () => {
    const rows = Array.from({ length: 15 }, (_, i) => ({
      kind: "print_failed",
      ref: `j${i}`,
      code: "expired",
      created_at: new Date(now - (i + 1) * 60_000).toISOString(),
    }));
    const supabase = client({
      ops_events: query({ data: rows, error: null }),
      print_jobs: query({ data: [], error: null }),
    });
    const out = await summarizeIncidents(supabase, "v1", 72, now);
    expect(out.recent).toHaveLength(10);
    expect(out.recent[0].ref).toBe("j0");
    expect(out.recent[9].ref).toBe("j9");
    expect(out.incidents).toEqual([
      { kind: "print_failed", count: 15, lastAt: rows[0].created_at },
    ]);
  });

  it("throws when a read fails", async () => {
    const supabase = client({
      ops_events: query({ data: null, error: { message: "down" } }),
      print_jobs: query({ data: [], error: null }),
    });
    await expect(summarizeIncidents(supabase, "v1", 72, now)).rejects.toThrow(
      "ops_events read failed",
    );
  });

  it("throws when the stuck-job read fails", async () => {
    const supabase = client({
      ops_events: query({ data: [], error: null }),
      print_jobs: query({ data: null, error: { message: "down" } }),
    });
    await expect(summarizeIncidents(supabase, "v1", 72, now)).rejects.toThrow(
      "print_jobs read failed",
    );
  });
});
