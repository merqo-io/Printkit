import { describe, it, expect, vi } from "vitest";

const verifyKitAuth = vi.fn();
const createOrUpdatePrintLocation = vi.fn();
vi.mock("@/lib/kit-auth", () => ({
  verifyKitAuth: (...a: unknown[]) => verifyKitAuth(...a),
}));
vi.mock("@/lib/print-locations", () => ({
  createOrUpdatePrintLocation: (...a: unknown[]) =>
    createOrUpdatePrintLocation(...a),
}));

const rpcMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => Promise.resolve({ rpc: rpcMock }),
}));

import { POST } from "./route";
import { beforeEach } from "vitest";

beforeEach(() => {
  verifyKitAuth.mockReset();
  rpcMock.mockReset().mockResolvedValue({ data: true, error: null });
});

function req(body: unknown) {
  return new Request("http://localhost/api/v1/print-locations", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/print-locations", () => {
  it("answers 429 with Retry-After before touching auth when the IP is limited", async () => {
    rpcMock.mockResolvedValue({ data: false, error: null });
    const request = req({});
    request.headers.set("x-vercel-forwarded-for", "203.0.113.9");
    const res = await POST(request);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
    expect(verifyKitAuth).not.toHaveBeenCalled();
  });

  it("rejects source_ref over 128 characters", async () => {
    verifyKitAuth.mockResolvedValue({ kitSlug: "qkit" });
    const res = await POST(
      req({
        vendor_id: "11111111-1111-1111-8111-111111111111",
        source_ref: "x".repeat(129),
        label: "Booth",
        active: true,
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 401 when the bearer secret doesn't verify", async () => {
    verifyKitAuth.mockResolvedValue(null);
    const res = await POST(req({}));
    expect(res.status).toBe(401);
  });

  it("returns 400 on an invalid body", async () => {
    verifyKitAuth.mockResolvedValue({ kitSlug: "qkit" });
    const res = await POST(req({ vendor_id: "not-a-uuid" }));
    expect(res.status).toBe(400);
  });

  it("upserts and returns 201 with the location id", async () => {
    verifyKitAuth.mockResolvedValue({ kitSlug: "qkit" });
    createOrUpdatePrintLocation.mockResolvedValue({ ok: true, id: "loc-1" });

    const res = await POST(
      req({
        vendor_id: "11111111-1111-1111-8111-111111111111",
        source_ref: "booth-1",
        label: "Kopitiam Cart",
        active: true,
      }),
    );

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: "loc-1" });
    expect(createOrUpdatePrintLocation).toHaveBeenCalledWith({
      vendorId: "11111111-1111-1111-8111-111111111111",
      sourceKit: "qkit",
      sourceRef: "booth-1",
      label: "Kopitiam Cart",
      active: true,
    });
  });

  it("returns the createOrUpdatePrintLocation error status/message on failure (e.g. 500)", async () => {
    verifyKitAuth.mockResolvedValue({ kitSlug: "qkit" });
    createOrUpdatePrintLocation.mockResolvedValue({
      ok: false,
      status: 500,
      error: "Could not save print location.",
    });

    const res = await POST(
      req({
        vendor_id: "11111111-1111-1111-8111-111111111111",
        source_ref: "booth-1",
        label: "Kopitiam Cart",
        active: true,
      }),
    );

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({
      error: "Could not save print location.",
    });
  });
});
