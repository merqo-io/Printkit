import { beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => vi.fn());
vi.mock("@/lib/vendor-session", () => ({ getVendorSession: session }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const unregister = vi.hoisted(() => vi.fn());
vi.mock("@/lib/connectors/vendor-cloud/drivers", () => ({
  getVendorCloudDriver: (id: string) =>
    id === "feie" ? { unregisterPrinter: unregister } : null,
}));

const L = "22222222-2222-4222-8222-222222222222";
const readEqs: Array<[string, string]> = [];
const deleteEqs: Array<[string, string]> = [];
const auditInsert = vi.fn();
const deleteMock = vi.fn();

type PrinterFixture = {
  id: string;
  connector: string;
  catalog_id: string;
  driver: string;
  device_ref: string | null;
};
const starPrinter: PrinterFixture = {
  id: "printer-1",
  connector: "cloud_poll",
  catalog_id: "star-mc-label2",
  driver: "star",
  device_ref: null,
};
let printer: PrinterFixture | null = starPrinter;
let readError: { message: string } | null = null;
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
        return {
          select: () => {
            const read = {
              eq: (column: string, value: string) => {
                readEqs.push([column, value]);
                return read;
              },
              maybeSingle: () =>
                Promise.resolve({ data: printer, error: readError }),
            };
            return read;
          },
          delete: () => {
            deleteMock();
            const del = {
              eq: (column: string, value: string) => {
                deleteEqs.push([column, value]);
                return deleteEqs.length % 2 === 0
                  ? Promise.resolve({ error: deleteError })
                  : del;
              },
            };
            return del;
          },
        };
      },
    }),
}));

import { removePrinter } from "./actions";

const feiePrinter: PrinterFixture = {
  id: "printer-2",
  connector: "vendor_cloud",
  catalog_id: "feie-fp-n20w",
  driver: "feie",
  device_ref: "SN123",
};

beforeEach(() => {
  session.mockReset().mockResolvedValue({ user: { id: "vendor-1" } });
  readEqs.length = 0;
  deleteEqs.length = 0;
  auditInsert.mockReset();
  deleteMock.mockReset();
  unregister.mockReset().mockResolvedValue(undefined);
  printer = starPrinter;
  readError = null;
  deleteError = null;
});

describe("removePrinter", () => {
  it("rejects a malformed location id before touching the database", async () => {
    const result = await removePrinter("not-a-uuid");
    expect(result.ok).toBe(false);
    expect(session).not.toHaveBeenCalled();
    expect(readEqs).toEqual([]);
  });

  it("propagates a failed session check", async () => {
    session.mockRejectedValue(new Error("redirect"));
    await expect(removePrinter(L)).rejects.toThrow("redirect");
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("scopes the read and the delete to the signed-in vendor", async () => {
    await removePrinter(L);
    expect(readEqs).toEqual([
      ["location_id", L],
      ["vendor_id", "vendor-1"],
    ]);
    expect(deleteEqs).toEqual([
      ["id", "printer-1"],
      ["vendor_id", "vendor-1"],
    ]);
  });

  it("refuses a booth the vendor does not own (no printer found)", async () => {
    printer = null;
    const result = await removePrinter(L);
    expect(result).toEqual({
      ok: false,
      error: "That booth has no printer to remove.",
    });
    expect(deleteMock).not.toHaveBeenCalled();
    expect(auditInsert).not.toHaveBeenCalled();
  });

  it("removes the printer and records the audit detail", async () => {
    const result = await removePrinter(L);
    expect(result).toEqual({ ok: true });
    expect(unregister).not.toHaveBeenCalled();
    expect(auditInsert).toHaveBeenCalledWith({
      admin_id: "vendor-1",
      action: "printer_removed",
      target_id: "printer-1",
      detail: {
        location_id: L,
        connector: "cloud_poll",
        catalog_id: "star-mc-label2",
      },
    });
  });

  it("unregisters a brand-cloud printer before deleting it", async () => {
    printer = feiePrinter;
    const result = await removePrinter(L);
    expect(unregister).toHaveBeenCalledWith("SN123");
    expect(deleteMock).toHaveBeenCalled();
    expect(result).toEqual({ ok: true });
  });

  it("still deletes when the maker's unregister fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    printer = feiePrinter;
    unregister.mockRejectedValue(new Error("down"));
    const result = await removePrinter(L);
    expect(deleteMock).toHaveBeenCalled();
    expect(result).toEqual({ ok: true });
  });

  it("reports a read failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    printer = null;
    readError = { message: "boom" };
    const result = await removePrinter(L);
    expect(result).toEqual({
      ok: false,
      error: "Could not remove the printer.",
    });
  });

  it("reports a delete failure and writes no audit entry", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    deleteError = { message: "boom" };
    const result = await removePrinter(L);
    expect(result).toEqual({
      ok: false,
      error: "Could not remove the printer.",
    });
    expect(auditInsert).not.toHaveBeenCalled();
  });
});
