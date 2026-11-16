import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { verifyRecoveryWindow } from "@/lib/recovery-window";

const { verifyOtpMock, getClaimsMock, createServerClientMock } = vi.hoisted(
  () => ({
    verifyOtpMock: vi.fn(),
    getClaimsMock: vi.fn(),
    createServerClientMock: vi.fn(),
  }),
);

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: createServerClientMock,
}));

beforeEach(() => {
  vi.stubEnv("SUPABASE_SECRET_KEY", "test-secret");
  verifyOtpMock.mockReset().mockResolvedValue({
    data: { session: { access_token: "jwt" } },
    error: null,
  });
  getClaimsMock.mockReset().mockResolvedValue({
    data: { claims: { session_id: "recovery-session" } },
    error: null,
  });
  createServerClientMock.mockReset().mockResolvedValue({
    auth: { verifyOtp: verifyOtpMock, getClaims: getClaimsMock },
  });
});
afterEach(() => vi.unstubAllEnvs());

function post(query: string, headers: Record<string, string> = {}) {
  const body = new URLSearchParams(query);
  return new Request("http://localhost/auth/confirm/verify", {
    method: "POST",
    headers: { origin: "http://localhost", ...headers },
    body,
  });
}

function recoveryCookie(res: Response): string | undefined {
  return res.headers
    .getSetCookie()
    .find((cookie) => cookie.startsWith("printkit_recovery="));
}

describe("POST /auth/confirm/verify", () => {
  it("verifies the token and lands on /dashboard by default", async () => {
    const { POST } = await import("./route");
    const res = await POST(post("token_hash=abc&type=magiclink"));
    expect(verifyOtpMock).toHaveBeenCalledWith({
      token_hash: "abc",
      type: "magiclink",
    });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://localhost/dashboard");
    expect(recoveryCookie(res)).toBeUndefined();
  });

  it("follows a safe next and ignores an unsafe one", async () => {
    const { POST } = await import("./route");
    const safe = await POST(
      post("token_hash=abc&type=signup&next=/dashboard/history"),
    );
    expect(safe.headers.get("location")).toBe(
      "http://localhost/dashboard/history",
    );
    const unsafe = await POST(
      post("token_hash=abc&type=signup&next=https://evil.example"),
    );
    expect(unsafe.headers.get("location")).toBe("http://localhost/dashboard");
  });

  it("opens a recovery window and goes to /reset-password for a recovery token", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      post("token_hash=abc&type=recovery&next=/dashboard"),
    );
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://localhost/reset-password");
    const cookie = recoveryCookie(res);
    expect(cookie).toBeDefined();
    expect(getClaimsMock).toHaveBeenCalledWith("jwt");
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).toMatch(/Path=\/reset-password/);
    expect(cookie).toMatch(/Max-Age=900/);
    const value = cookie!.split(";")[0].slice("printkit_recovery=".length);
    expect(verifyRecoveryWindow(value, "recovery-session")).toBe(true);
    expect(verifyRecoveryWindow(value, "another-session")).toBe(false);
  });

  it("sets no cookie when the session id cannot be read", async () => {
    getClaimsMock.mockResolvedValue({ data: null, error: null });
    const { POST } = await import("./route");
    const res = await POST(post("token_hash=abc&type=recovery"));
    expect(res.headers.get("location")).toBe("http://localhost/reset-password");
    expect(recoveryCookie(res)).toBeUndefined();
  });

  it("sets no cookie and still redirects when getClaims throws", async () => {
    getClaimsMock.mockRejectedValue(new Error("network"));
    const { POST } = await import("./route");
    const res = await POST(post("token_hash=abc&type=recovery"));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://localhost/reset-password");
    expect(recoveryCookie(res)).toBeUndefined();
  });

  it("sets no cookie when the verification result has no session", async () => {
    verifyOtpMock.mockResolvedValue({ data: { session: null }, error: null });
    const { POST } = await import("./route");
    const res = await POST(post("token_hash=abc&type=recovery"));
    expect(recoveryCookie(res)).toBeUndefined();
    expect(getClaimsMock).not.toHaveBeenCalled();
  });

  it("redirects to /login?error=link when verification fails", async () => {
    verifyOtpMock.mockResolvedValue({ data: {}, error: new Error("expired") });
    const { POST } = await import("./route");
    const res = await POST(post("token_hash=abc&type=recovery"));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(
      "http://localhost/login?error=link",
    );
    expect(recoveryCookie(res)).toBeUndefined();
  });

  it("rejects a cross-origin POST without verifying", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      post("token_hash=abc&type=magiclink", { origin: "https://evil.example" }),
    );
    expect(res.headers.get("location")).toBe(
      "http://localhost/login?error=link",
    );
    expect(verifyOtpMock).not.toHaveBeenCalled();
  });

  it("is POST only", async () => {
    const route = await import("./route");
    expect(Object.keys(route)).toEqual(["POST"]);
  });
});
