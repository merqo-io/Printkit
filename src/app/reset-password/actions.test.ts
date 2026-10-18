import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { cookieGet, cookieDelete, getClaims, updateUser } = vi.hoisted(() => ({
  cookieGet: vi.fn(),
  cookieDelete: vi.fn(),
  getClaims: vi.fn(),
  updateUser: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: cookieGet, delete: cookieDelete }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: async () => ({ auth: { getClaims, updateUser } }),
}));

import { mintRecoveryWindow } from "@/lib/recovery-window";
import { updatePasswordAction } from "./actions";

const input = { password: "new-password-123", confirm: "new-password-123" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SUPABASE_SECRET_KEY", "test-secret");
  getClaims.mockResolvedValue({
    data: { claims: { session_id: "recovery-session" } },
    error: null,
  });
  cookieGet.mockReturnValue({ value: mintRecoveryWindow("recovery-session") });
  updateUser.mockResolvedValue({ error: null });
});
afterEach(() => vi.unstubAllEnvs());

describe("updatePasswordAction", () => {
  it("updates the password and closes the recovery window", async () => {
    const result = await updatePasswordAction(input);
    expect(result).toEqual({ success: true });
    expect(updateUser).toHaveBeenCalledWith({ password: "new-password-123" });
    expect(cookieDelete).toHaveBeenCalledWith({
      name: "printkit_recovery",
      path: "/reset-password",
    });
  });

  it("refuses a plain signed-in session without a recovery window", async () => {
    cookieGet.mockReturnValue(undefined);
    const result = await updatePasswordAction(input);
    expect(result).toMatchObject({ success: false, expired: true });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("refuses a recovery window minted for another session", async () => {
    cookieGet.mockReturnValue({ value: mintRecoveryWindow("other-session") });
    const result = await updatePasswordAction(input);
    expect(result).toMatchObject({ success: false, expired: true });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("refuses when the session cannot be checked", async () => {
    getClaims.mockResolvedValue({
      data: null,
      error: { message: "Auth unavailable" },
    });
    const result = await updatePasswordAction(input);
    expect(result).toEqual({
      success: false,
      error: "Could not check your reset link. Please try again.",
    });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it.each([
    [{ password: "short", confirm: "short" }, /at least 8/],
    [{ password: "long-password", confirm: "different" }, /do not match/],
    [null, /check your password/i],
  ])("rejects invalid input %j before the auth API", async (bad, message) => {
    const result = await updatePasswordAction(bad);
    expect(result.success).toBe(false);
    expect(!result.success && result.error).toMatch(message);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("keeps the window open for a retry when Supabase rejects the update", async () => {
    updateUser.mockResolvedValue({
      error: { message: "Password is too weak" },
    });
    const result = await updatePasswordAction(input);
    expect(result).toEqual({ success: false, error: "Password is too weak" });
    expect(cookieDelete).not.toHaveBeenCalled();
  });

  it("returns a retryable error when the update call throws", async () => {
    updateUser.mockRejectedValue(new Error("network"));
    const result = await updatePasswordAction(input);
    expect(result).toEqual({
      success: false,
      error: "Could not update your password. Please try again.",
    });
    expect(cookieDelete).not.toHaveBeenCalled();
  });
});
