import { describe, expect, it, vi } from "vitest";
import { clientIp, rateLimit } from "./rate-limit";

describe("clientIp", () => {
  it("takes the trimmed first hop of x-forwarded-for", () => {
    expect(
      clientIp(new Headers({ "x-forwarded-for": " 203.0.113.5 , 70.41.3.18" })),
    ).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip, then to unknown", () => {
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.7" }))).toBe(
      "198.51.100.7",
    );
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

function supabaseStub(data: unknown, error: unknown = null) {
  return {
    rpc: vi.fn(() => Promise.resolve({ data, error })),
  } as unknown as Parameters<typeof rateLimit>[0];
}

describe("rateLimit", () => {
  it("calls check_rate_limit with the key, limit and window", async () => {
    const supabase = supabaseStub(true);
    await rateLimit(supabase, "pair:1.2.3.4", 10, 60);
    expect(supabase.rpc).toHaveBeenCalledWith("check_rate_limit", {
      p_key: "pair:1.2.3.4",
      p_limit: 10,
      p_window_seconds: 60,
    });
  });

  it("returns the limiter's answer", async () => {
    await expect(rateLimit(supabaseStub(true), "k", 1, 1)).resolves.toBe(true);
    await expect(rateLimit(supabaseStub(false), "k", 1, 1)).resolves.toBe(
      false,
    );
  });

  it("fails open when the limiter returns an error", async () => {
    await expect(
      rateLimit(supabaseStub(null, { message: "reset" }), "k", 1, 1),
    ).resolves.toBe(true);
  });

  it("fails open when the limiter call rejects", async () => {
    const supabase = {
      rpc: vi.fn().mockRejectedValue(new Error("network")),
    } as unknown as Parameters<typeof rateLimit>[0];
    await expect(rateLimit(supabase, "k", 1, 1)).resolves.toBe(true);
  });
});
