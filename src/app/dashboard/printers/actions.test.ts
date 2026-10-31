import { beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => vi.fn());
vi.mock("@/lib/vendor-session", () => ({ getVendorSession: session }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const L = "22222222-2222-4222-8222-222222222222";
const eqs: Array<[string, string]> = [];
const auditInsert = vi.fn();
let deleted: Array<{ id: string }> | null = [{ id: "printer-1" }];
let deleteError: { message: string } | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () =>
    Promise.resolve({
      from: (table: string) => {
        if (table === "admin_audit") {
          return {
            insert: (row: unknown) => {
              auditInsert(row);
              return Promise.resolve({ error: null });
            },
          };
        }
        const query = {
          delete: () => query,
          eq: (column: string, value: string) => {
            eqs.push([column, value]);
            return query;
          },
          select: () => Promise.resolve({ data: deleted, error: deleteError }),
        };
        return query;
      },
    }),
}));

import { removePrinter } from "./actions";

beforeEach(() => {
  session.mockReset().mockResolvedValue({ user: { id: "vendor-1" } });
  eqs.length = 0;
  auditInsert.mockReset();
  deleted = [{ id: "printer-1" }];
  deleteError = null;
});

describe("removePrinter", () => {
  it("rejects a malformed location id before touching the database", async () => {
    const result = await removePrinter("not-a-uuid");
    expect(result.ok).toBe(false);
    expect(session).not.toHaveBeenCalled();
    expect(eqs).toEqual([]);
  });

  it("propagates a failed session check", async () => {
    session.mockRejectedValue(new Error("redirect"));
    await expect(removePrinter(L)).rejects.toThrow("redirect");
    expect(eqs).toEqual([]);
  });

  it("scopes the delete to the signed-in vendor and the booth", async () => {
    await removePrinter(L);
    expect(eqs).toEqual([
      ["location_id", L],
      ["vendor_id", "vendor-1"],
    ]);
  });

  it("refuses a booth the vendor does not own (nothing deleted)", async () => {
    deleted = [];
    const result = await removePrinter(L);
    expect(result).toEqual({
      ok: false,
      error: "That booth has no printer to remove.",
    });
    expect(auditInsert).not.toHaveBeenCalled();
  });

  it("removes the printer and records the audit entry", async () => {
    const result = await removePrinter(L);
    expect(result).toEqual({ ok: true });
    expect(auditInsert).toHaveBeenCalledWith({
      admin_id: "vendor-1",
      action: "printer_removed",
      target_id: "printer-1",
      detail: null,
    });
  });

  it("reports a database failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    deleted = null;
    deleteError = { message: "boom" };
    const result = await removePrinter(L);
    expect(result).toEqual({
      ok: false,
      error: "Could not remove the printer.",
    });
  });
});
