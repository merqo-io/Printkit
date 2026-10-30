import { describe, it, expect, vi, beforeEach } from "vitest";

const rpcMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => Promise.resolve({ rpc: rpcMock }),
}));
const redeemPairingCodeMock = vi.fn();
vi.mock("@/lib/bridge-pairing", () => ({
  redeemPairingCode: (...args: unknown[]) => redeemPairingCodeMock(...args),
}));
const mintDeviceCredentialMock = vi.fn();
vi.mock("@/lib/device-credentials", () => ({
  mintDeviceCredential: (...args: unknown[]) =>
    mintDeviceCredentialMock(...args),
}));

import { POST } from "./route";

function pairRequest(code = "ABCD1234") {
  return new Request("https://printkit.test/api/v1/bridge-agent/pair", {
    method: "POST",
    body: JSON.stringify({ code }),
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.5, 10.0.0.1",
    },
  });
}

beforeEach(() => {
  rpcMock.mockReset().mockResolvedValue({ data: true, error: null });
  redeemPairingCodeMock.mockReset().mockResolvedValue("printer-1");
  mintDeviceCredentialMock.mockReset().mockResolvedValue("agent-token");
});

describe("bridge-agent pair route", () => {
  it("pairs when under the limit", async () => {
    const response = await POST(pairRequest());
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ token: "agent-token" });
  });

  it("limits each IP to 10 attempts per 60 seconds", async () => {
    await POST(pairRequest());
    expect(rpcMock).toHaveBeenCalledWith("check_rate_limit", {
      p_key: "pair:203.0.113.5",
      p_limit: 10,
      p_window_seconds: 60,
    });
  });

  it("answers 429 over the limit without redeeming the code", async () => {
    rpcMock.mockResolvedValue({ data: false, error: null });
    const response = await POST(pairRequest());
    expect(response.status).toBe(429);
    expect(redeemPairingCodeMock).not.toHaveBeenCalled();
  });

  it("lets the request through when the limiter errors", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "down" } });
    const response = await POST(pairRequest());
    expect(response.status).toBe(201);
  });

  it("still rejects an invalid code", async () => {
    redeemPairingCodeMock.mockResolvedValue(null);
    const response = await POST(pairRequest());
    expect(response.status).toBe(401);
  });
});
