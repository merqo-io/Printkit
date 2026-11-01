import { beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => vi.fn());
vi.mock("@/lib/vendor-session", () => ({ getVendorSession: session }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/connectors/vendor-cloud/drivers", () => ({
  getVendorCloudDriver: () => null,
}));
const dispatch = vi.hoisted(() => vi.fn());
vi.mock("@/lib/job-dispatch", () => ({ dispatchJob: dispatch }));

const L = "22222222-2222-4222-8222-222222222222";
const state = vi.hoisted(() => ({
  printer: null as { display_name: string; last_seen_at: string | null } | null,
  recent: [] as { id: string }[],
  insertError: null as { message: string } | null,
  printerEqs: [] as Array<[string, string]>,
  inserted: [] as unknown[],
  audits: [] as unknown[],
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () =>
    Promise.resolve({
      from: (table: string) => {
        if (table === "admin_audit") {
          return {
            insert: (row: unknown) => {
              state.audits.push(row);
              return Promise.resolve({ error: null });
            },
          };
        }
        if (table === "printers") {
          const read = {
            eq: (column: string, value: string) => {
              state.printerEqs.push([column, value]);
              return read;
            },
            maybeSingle: () =>
              Promise.resolve({ data: state.printer, error: null }),
          };
          return { select: () => read };
        }
        return {
          select: () => {
            const chain = {
              eq: () => chain,
              gte: () => chain,
              limit: () => Promise.resolve({ data: state.recent, error: null }),
              single: () =>
                Promise.resolve({
                  data: state.insertError ? null : { id: "job-1" },
                  error: state.insertError,
                }),
            };
            return chain;
          },
          insert: (row: unknown) => {
            state.inserted.push(row);
            return {
              select: () => ({
                single: () =>
                  Promise.resolve({
                    data: state.insertError ? null : { id: "job-1" },
                    error: state.insertError,
                  }),
              }),
            };
          },
        };
      },
    }),
}));

import { sendTestPrint } from "./actions";

beforeEach(() => {
  vi.resetAllMocks();
  session.mockResolvedValue({ user: { id: "vendor-a" } });
  state.printer = { display_name: "Printer A", last_seen_at: null };
  state.recent = [];
  state.insertError = null;
  state.printerEqs = [];
  state.inserted = [];
  state.audits = [];
  dispatch.mockResolvedValue(undefined);
});

describe("sendTestPrint", () => {
  it("rejects an id that is not a uuid", async () => {
    expect(await sendTestPrint("nope")).toEqual({
      ok: false,
      error: "Check the details and try again.",
    });
    expect(state.inserted).toHaveLength(0);
  });

  it("refuses a booth the caller has no printer for", async () => {
    state.printer = null;
    const result = await sendTestPrint(L);
    expect(result).toEqual({
      ok: false,
      error: "That booth has no printer to test.",
    });
    expect(state.printerEqs).toContainEqual(["vendor_id", "vendor-a"]);
    expect(state.inserted).toHaveLength(0);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("queues a test job, dispatches it and audits it", async () => {
    const result = await sendTestPrint(L);
    expect(result).toEqual({ ok: true, offline: true });
    expect(state.inserted).toHaveLength(1);
    expect(state.inserted[0]).toMatchObject({
      vendor_id: "vendor-a",
      job_type: "label",
      source_kit: "printkit-test",
      location_id: L,
      payload: { customer_name: "Printer A", order_number: "TEST" },
    });
    expect(dispatch).toHaveBeenCalledWith("job-1");
    expect(state.audits[0]).toMatchObject({
      admin_id: "vendor-a",
      action: "test_print_sent",
      target_id: "job-1",
    });
  });

  it("reports online when the printer was seen recently", async () => {
    state.printer = {
      display_name: "Printer A",
      last_seen_at: new Date().toISOString(),
    };
    expect(await sendTestPrint(L)).toEqual({ ok: true, offline: false });
  });

  it("refuses a second test inside the cooldown", async () => {
    state.recent = [{ id: "earlier" }];
    const result = await sendTestPrint(L);
    expect(result.ok).toBe(false);
    expect(state.inserted).toHaveLength(0);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("returns a plain error when the insert fails", async () => {
    state.insertError = { message: "boom" };
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await sendTestPrint(L)).toEqual({
      ok: false,
      error: "Could not send the test label.",
    });
  });

  it("still succeeds when dispatch throws", async () => {
    dispatch.mockRejectedValue(new Error("feie down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await sendTestPrint(L)).ok).toBe(true);
  });
});
