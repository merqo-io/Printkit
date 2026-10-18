import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { cookieGet } = vi.hoisted(() => ({ cookieGet: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: cookieGet }),
}));

import {
  RECOVERY_WINDOW_COOKIE,
  RECOVERY_WINDOW_SECONDS,
  getRecoveryState,
  mintRecoveryWindow,
  recoveryWindowCookieOptions,
  verifyRecoveryWindow,
} from "./recovery-window";

const NOW = Date.UTC(2026, 9, 18, 12, 0, 0);

beforeEach(() => {
  vi.stubEnv("SUPABASE_SECRET_KEY", "test-secret");
  cookieGet.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

describe("recovery window token", () => {
  it("verifies for the session it was minted for, inside the window", () => {
    const token = mintRecoveryWindow("session-1", NOW);
    expect(verifyRecoveryWindow(token, "session-1", NOW + 60_000)).toBe(true);
  });

  it("rejects another session", () => {
    const token = mintRecoveryWindow("session-1", NOW);
    expect(verifyRecoveryWindow(token, "session-2", NOW)).toBe(false);
  });

  it("rejects once the window has passed", () => {
    const token = mintRecoveryWindow("session-1", NOW);
    expect(
      verifyRecoveryWindow(
        token,
        "session-1",
        NOW + RECOVERY_WINDOW_SECONDS * 1000 + 1,
      ),
    ).toBe(false);
  });

  it("rejects a token with a pushed-out expiry", () => {
    const token = mintRecoveryWindow("session-1", NOW);
    const [, signature] = token.split(".");
    const forged = `${Math.floor(NOW / 1000) + 999_999}.${signature}`;
    expect(verifyRecoveryWindow(forged, "session-1", NOW)).toBe(false);
  });

  it("rejects a token signed with another secret", () => {
    const token = mintRecoveryWindow("session-1", NOW);
    vi.stubEnv("SUPABASE_SECRET_KEY", "other-secret");
    expect(verifyRecoveryWindow(token, "session-1", NOW)).toBe(false);
  });

  it.each([undefined, "", "garbage", "123.", ".abc", "12x.abc", "1.a.b"])(
    "rejects a malformed value %j",
    (value) => {
      expect(verifyRecoveryWindow(value, "session-1", NOW)).toBe(false);
    },
  );

  it("refuses to mint without a signing secret", () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    expect(() => mintRecoveryWindow("session-1", NOW)).toThrow(
      /SUPABASE_SECRET_KEY/,
    );
  });

  it("scopes the cookie to the reset page as httpOnly, secure and lax", () => {
    expect(recoveryWindowCookieOptions).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/reset-password",
      maxAge: RECOVERY_WINDOW_SECONDS,
    });
  });
});

describe("getRecoveryState", () => {
  function client(result: {
    data: { claims: { session_id?: string } } | null;
    error: { message: string } | null;
  }) {
    return { auth: { getClaims: vi.fn().mockResolvedValue(result) } };
  }

  it("is ready for a session holding its own recovery window", async () => {
    cookieGet.mockReturnValue({ value: mintRecoveryWindow("session-1") });
    const state = await getRecoveryState(
      client({ data: { claims: { session_id: "session-1" } }, error: null }),
    );
    expect(cookieGet).toHaveBeenCalledWith(RECOVERY_WINDOW_COOKIE);
    expect(state).toBe("ready");
  });

  it("is expired for a plain signed-in session with no window", async () => {
    cookieGet.mockReturnValue(undefined);
    const state = await getRecoveryState(
      client({ data: { claims: { session_id: "session-1" } }, error: null }),
    );
    expect(state).toBe("expired");
  });

  it("is expired when the window belongs to another session", async () => {
    cookieGet.mockReturnValue({ value: mintRecoveryWindow("session-1") });
    const state = await getRecoveryState(
      client({ data: { claims: { session_id: "session-2" } }, error: null }),
    );
    expect(state).toBe("expired");
  });

  it("is expired without a session", async () => {
    cookieGet.mockReturnValue({ value: mintRecoveryWindow("session-1") });
    const state = await getRecoveryState(client({ data: null, error: null }));
    expect(state).toBe("expired");
  });

  it("is expired when the claims carry no session id", async () => {
    cookieGet.mockReturnValue({ value: mintRecoveryWindow("session-1") });
    const state = await getRecoveryState(
      client({ data: { claims: {} }, error: null }),
    );
    expect(state).toBe("expired");
  });

  it("fails when the session cannot be checked", async () => {
    const state = await getRecoveryState(
      client({ data: null, error: { message: "Auth unavailable" } }),
    );
    expect(state).toBe("failed");
  });

  it("fails when the auth call rejects", async () => {
    const state = await getRecoveryState({
      auth: { getClaims: vi.fn().mockRejectedValue(new Error("network")) },
    });
    expect(state).toBe("failed");
  });
});
