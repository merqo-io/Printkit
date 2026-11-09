import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createServiceClient: vi.fn() }));

import { clientIp, rateLimit, rateLimitStrict } from "./rate-limit";

describe("clientIp", () => {
  it("prefers x-vercel-forwarded-for over every other header", () => {
    expect(
      clientIp(
        new Headers({
          "x-vercel-forwarded-for": " 203.0.113.5 , 10.0.0.1",
          "x-real-ip": "198.51.100.7",
          "x-forwarded-for": "1.1.1.1, 2.2.2.2",
        }),
      ),
    ).toBe("203.0.113.5");
  });

  it("uses x-real-ip when the Vercel header is absent", () => {
    expect(
      clientIp(
        new Headers({
          "x-real-ip": "198.51.100.7",
          "x-forwarded-for": "1.1.1.1, 2.2.2.2",
        }),
      ),
    ).toBe("198.51.100.7");
  });

  it("uses the last x-forwarded-for hop and ignores a spoofed first hop", () => {
    expect(
      clientIp(
        new Headers({
          "x-forwarded-for": "6.6.6.6, 70.41.3.18 , 203.0.113.5 ",
        }),
      ),
    ).toBe("203.0.113.5");
  });

  it("returns null for a header value that is not an IP or carries a port", () => {
    expect(clientIp(new Headers({ "x-real-ip": "not-an-ip" }))).toBeNull();
    expect(
      clientIp(new Headers({ "x-real-ip": "203.0.113.5:443" })),
    ).toBeNull();
    expect(
      clientIp(new Headers({ "x-forwarded-for": "6.6.6.6, garbage" })),
    ).toBeNull();
  });

  it("returns null when no header names a client", () => {
    expect(clientIp(new Headers())).toBeNull();
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

  it("strict variant returns the limiter's answer", async () => {
    await expect(rateLimitStrict(supabaseStub(true), "k", 1, 1)).resolves.toBe(
      true,
    );
    await expect(rateLimitStrict(supabaseStub(false), "k", 1, 1)).resolves.toBe(
      false,
    );
  });

  it("strict variant fails closed on an error", async () => {
    await expect(
      rateLimitStrict(supabaseStub(null, { message: "reset" }), "k", 1, 1),
    ).resolves.toBe(false);
  });

  it("strict variant fails closed when the call rejects", async () => {
    const supabase = {
      rpc: vi.fn().mockRejectedValue(new Error("network")),
    } as unknown as Parameters<typeof rateLimit>[0];
    await expect(rateLimitStrict(supabase, "k", 1, 1)).resolves.toBe(false);
  });
});
