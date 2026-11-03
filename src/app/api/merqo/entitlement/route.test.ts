import { describe, it, expect, vi, beforeEach } from "vitest";

const rpcMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => Promise.resolve({ rpc: rpcMock }),
}));

import { POST } from "./route";

const payload = {
  email: "vendor@business.sg",
  kit: "printkit",
  tier: "paid",
  founder: false,
  stats_window: "24h",
  event_pass: null,
  valid_until: "2026-12-01T00:00:00+08:00",
  issued_at: "2026-11-03T10:00:00+08:00",
};

function req(body: unknown, auth: string | null = "Bearer test-secret") {
  return new Request("http://localhost/api/merqo/entitlement", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(auth ? { authorization: auth } : {}),
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/merqo/entitlement", () => {
  beforeEach(() => {
    rpcMock.mockReset().mockResolvedValue({ data: "stored", error: null });
    process.env.MERQO_PROVISION_SECRET = "test-secret";
  });

  it("401 when the bearer is missing", async () => {
    expect((await POST(req(payload, null))).status).toBe(401);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("401 when the bearer is wrong", async () => {
    expect((await POST(req(payload, "Bearer nope"))).status).toBe(401);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("401 when only the metrics secret matches", async () => {
    process.env.MERQO_METRICS_SECRET = "metrics";
    expect((await POST(req(payload, "Bearer metrics"))).status).toBe(401);
    delete process.env.MERQO_METRICS_SECRET;
  });

  it("400 on malformed JSON", async () => {
    expect((await POST(req("{not json"))).status).toBe(400);
  });

  it("400 on a body that fails the contract", async () => {
    const res = await POST(req({ ...payload, email: "not-an-email" }));
    expect(res.status).toBe(400);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("400 on a tier the contract rejects for this kit", async () => {
    expect((await POST(req({ ...payload, tier: "starter" }))).status).toBe(400);
  });

  it("400 for another kit", async () => {
    const res = await POST(req({ ...payload, kit: "stockkit" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "wrong_kit" });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("404 when the email has no account", async () => {
    rpcMock.mockResolvedValue({ data: "unknown_vendor", error: null });
    const res = await POST(req(payload));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ ok: false, error: "unknown_vendor" });
  });

  it("200 and passes the event pass window through", async () => {
    const pass = {
      starts_at: "2026-11-05T00:00:00+08:00",
      ends_at: "2026-11-08T00:00:00+08:00",
    };
    const res = await POST(req({ ...payload, tier: "free", event_pass: pass }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(rpcMock).toHaveBeenCalledWith(
      "apply_vendor_entitlement",
      expect.objectContaining({
        p_email: "vendor@business.sg",
        p_tier: "free",
        p_event_pass_starts_at: pass.starts_at,
        p_event_pass_ends_at: pass.ends_at,
      }),
    );
  });

  it("200 with no change for a stale push", async () => {
    rpcMock.mockResolvedValue({ data: "stale", error: null });
    const res = await POST(req(payload));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("500 when the store fails", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect((await POST(req(payload))).status).toBe(500);
  });
});
