import { describe, it, expect, vi, beforeEach } from "vitest";

const rpcMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => Promise.resolve({ rpc: rpcMock }),
}));

import { vendorHasLabelAccess } from "./vendor-entitlement";

describe("vendorHasLabelAccess", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("is true when the database grants access", async () => {
    rpcMock.mockResolvedValue({ data: true, error: null });
    expect(await vendorHasLabelAccess("v1")).toBe(true);
    expect(rpcMock).toHaveBeenCalledWith("vendor_has_label_access", {
      p_vendor: "v1",
    });
  });

  it("is false when the vendor has no live entitlement or pass", async () => {
    rpcMock.mockResolvedValue({ data: false, error: null });
    expect(await vendorHasLabelAccess("v1")).toBe(false);
  });

  it("is null when the lookup errors, so callers fail closed", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "down" } });
    expect(await vendorHasLabelAccess("v1")).toBeNull();
  });

  it("is null when the client throws", async () => {
    rpcMock.mockRejectedValue(new Error("network"));
    expect(await vendorHasLabelAccess("v1")).toBeNull();
  });
});
