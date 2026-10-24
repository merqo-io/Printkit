import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { verifyRecoveryWindow } from "@/lib/recovery-window";

const { exchangeCodeForSessionMock, getClaimsMock, createServerClientMock } =
  vi.hoisted(() => ({
    exchangeCodeForSessionMock: vi.fn(),
    getClaimsMock: vi.fn(),
    createServerClientMock: vi.fn(),
  }));

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: createServerClientMock,
}));

beforeEach(() => {
  vi.stubEnv("SUPABASE_SECRET_KEY", "test-secret");
  exchangeCodeForSessionMock.mockReset();
  getClaimsMock.mockReset().mockResolvedValue({
    data: { claims: { session_id: "recovery-session" } },
    error: null,
  });
  createServerClientMock.mockReset().mockResolvedValue({
    auth: {
      exchangeCodeForSession: exchangeCodeForSessionMock,
      getClaims: getClaimsMock,
    },
  });
});
afterEach(() => vi.unstubAllEnvs());

function recoveryCookie(res: Response): string | undefined {
  return res.headers
    .getSetCookie()
    .find((cookie) => cookie.startsWith("printkit_recovery="));
}

function req(url: string) {
  return new Request(url);
}

describe("GET /auth/callback", () => {
  it("redirects to /login?error=oauth when no code param is present", async () => {
    const { GET } = await import("./route");
    const res = await GET(req("http://localhost/auth/callback"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost/login?error=oauth",
    );
    expect(createServerClientMock).not.toHaveBeenCalled();
  });

  it("redirects to /dashboard by default on a successful exchange", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({ error: null });
    const { GET } = await import("./route");
    const res = await GET(req("http://localhost/auth/callback?code=abc"));
    expect(exchangeCodeForSessionMock).toHaveBeenCalledWith("abc");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/dashboard");
  });

  it("redirects to a safe relative ?next= path on success", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({ error: null });
    const { GET } = await import("./route");
    const res = await GET(
      req("http://localhost/auth/callback?code=abc&next=/settings"),
    );
    expect(res.headers.get("location")).toBe("http://localhost/settings");
  });

  it("falls back to /dashboard when ?next= is a protocol-relative open redirect (//evil.com)", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({ error: null });
    const { GET } = await import("./route");
    const res = await GET(
      req("http://localhost/auth/callback?code=abc&next=//evil.com"),
    );
    expect(res.headers.get("location")).toBe("http://localhost/dashboard");
  });

  it.each([
    ["an absolute URL", "https://evil.com"],
    ["a backslash path", "/\\evil.com"],
    ["a control character", "/\t/evil.com"],
  ])("falls back to /dashboard when ?next= is %s", async (_label, next) => {
    exchangeCodeForSessionMock.mockResolvedValue({ error: null });
    const { GET } = await import("./route");
    const res = await GET(
      req(
        "http://localhost/auth/callback?code=abc&next=" +
          encodeURIComponent(next),
      ),
    );
    expect(res.headers.get("location")).toBe("http://localhost/dashboard");
  });

  it("returns to a deep link with its query string and fragment", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({ error: null });
    const { GET } = await import("./route");
    const res = await GET(
      req(
        "http://localhost/auth/callback?code=abc&next=" +
          encodeURIComponent("/dashboard/printers?location=loc-1#booth-loc-1"),
      ),
    );
    expect(res.headers.get("location")).toBe(
      "http://localhost/dashboard/printers?location=loc-1#booth-loc-1",
    );
  });

  it("redirects to /login?error=oauth when the code exchange fails", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: { message: "invalid code" },
    });
    const { GET } = await import("./route");
    const res = await GET(req("http://localhost/auth/callback?code=bad"));
    expect(res.headers.get("location")).toBe(
      "http://localhost/login?error=oauth",
    );
  });

  describe("recovery window", () => {
    const recoveryExchange = {
      data: {
        session: { access_token: "recovery-jwt" },
        redirectType: "recovery",
      },
      error: null,
    };

    it("opens a recovery window bound to the new session after a reset-link exchange", async () => {
      exchangeCodeForSessionMock.mockResolvedValue(recoveryExchange);
      const { GET } = await import("./route");
      const res = await GET(req("http://localhost/auth/callback?code=abc"));
      expect(res.headers.get("location")).toBe(
        "http://localhost/reset-password",
      );
      expect(getClaimsMock).toHaveBeenCalledWith("recovery-jwt");
      const cookie = recoveryCookie(res);
      expect(cookie).toBeDefined();
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/Secure/i);
      expect(cookie).toMatch(/SameSite=lax/i);
      expect(cookie).toMatch(/Path=\/reset-password/);
      expect(cookie).toMatch(/Max-Age=900/);
      const value = cookie!.split(";")[0]!.split("=")[1]!;
      expect(verifyRecoveryWindow(value, "recovery-session")).toBe(true);
    });

    it("sends a reset-link exchange to the reset page whatever next says", async () => {
      exchangeCodeForSessionMock.mockResolvedValue(recoveryExchange);
      const { GET } = await import("./route");
      const res = await GET(
        req("http://localhost/auth/callback?code=abc&next=/dashboard"),
      );
      expect(res.headers.get("location")).toBe(
        "http://localhost/reset-password",
      );
      expect(recoveryCookie(res)).toBeDefined();
    });

    it.each(["/reset-password", "/dashboard", undefined])(
      "opens no recovery window for a sign-in exchange with next=%s",
      async (next) => {
        exchangeCodeForSessionMock.mockResolvedValue({
          data: {
            session: { access_token: "jwt" },
            redirectType: null,
          },
          error: null,
        });
        const { GET } = await import("./route");
        const res = await GET(
          req(
            "http://localhost/auth/callback?code=abc" +
              (next ? `&next=${encodeURIComponent(next)}` : ""),
          ),
        );
        expect(recoveryCookie(res)).toBeUndefined();
        expect(getClaimsMock).not.toHaveBeenCalled();
      },
    );

    it("opens no recovery window when the exchange fails", async () => {
      exchangeCodeForSessionMock.mockResolvedValue({
        data: { session: null, redirectType: null },
        error: { message: "expired" },
      });
      const { GET } = await import("./route");
      const res = await GET(req("http://localhost/auth/callback?code=bad"));
      expect(res.headers.get("location")).toBe(
        "http://localhost/login?error=oauth",
      );
      expect(recoveryCookie(res)).toBeUndefined();
    });

    it("still lands on the reset page, with no window, when the session id cannot be read", async () => {
      exchangeCodeForSessionMock.mockResolvedValue(recoveryExchange);
      getClaimsMock.mockResolvedValue({
        data: null,
        error: { message: "bad jwt" },
      });
      const { GET } = await import("./route");
      const res = await GET(req("http://localhost/auth/callback?code=abc"));
      expect(res.headers.get("location")).toBe(
        "http://localhost/reset-password",
      );
      expect(recoveryCookie(res)).toBeUndefined();
    });
  });

  describe("return-path cookie", () => {
    function withCookie(url: string, next: string) {
      return new Request(url, {
        headers: { cookie: `printkit_auth_next=${encodeURIComponent(next)}` },
      });
    }

    function clearedNextCookie(res: Response): string | undefined {
      return res.headers
        .getSetCookie()
        .find((cookie) => cookie.startsWith("printkit_auth_next="));
    }

    beforeEach(() => {
      exchangeCodeForSessionMock.mockResolvedValue({
        data: { session: { access_token: "jwt" }, redirectType: null },
        error: null,
      });
    });

    it("returns to the path saved in the cookie and clears it", async () => {
      const { GET } = await import("./route");
      const res = await GET(
        withCookie(
          "http://localhost/auth/callback?code=abc",
          "/dashboard/bridge#booth-1",
        ),
      );
      expect(res.headers.get("location")).toBe(
        "http://localhost/dashboard/bridge#booth-1",
      );
      const cleared = clearedNextCookie(res);
      expect(cleared).toMatch(/Max-Age=0/);
      expect(cleared).toMatch(/Path=\/auth/);
    });

    it.each(["https://evil.example", "//evil.example", "/\\evil.example"])(
      "falls back to /dashboard for an unsafe cookie %s",
      async (next) => {
        const { GET } = await import("./route");
        const res = await GET(
          withCookie("http://localhost/auth/callback?code=abc", next),
        );
        expect(res.headers.get("location")).toBe("http://localhost/dashboard");
        expect(clearedNextCookie(res)).toMatch(/Max-Age=0/);
      },
    );

    it("prefers a ?next= query param over the cookie", async () => {
      const { GET } = await import("./route");
      const res = await GET(
        withCookie(
          "http://localhost/auth/callback?code=abc&next=/settings",
          "/dashboard/bridge",
        ),
      );
      expect(res.headers.get("location")).toBe("http://localhost/settings");
    });

    it("clears the cookie when the exchange fails", async () => {
      exchangeCodeForSessionMock.mockResolvedValue({
        data: { session: null, redirectType: null },
        error: { message: "expired" },
      });
      const { GET } = await import("./route");
      const res = await GET(
        withCookie("http://localhost/auth/callback?code=bad", "/dashboard"),
      );
      expect(res.headers.get("location")).toBe(
        "http://localhost/login?error=oauth",
      );
      expect(clearedNextCookie(res)).toMatch(/Max-Age=0/);
    });
  });
});
