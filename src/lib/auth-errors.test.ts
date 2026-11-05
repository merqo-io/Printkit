import { describe, expect, it } from "vitest";
import {
  oauthErrorMessage,
  passwordUpdateErrorMessage,
  resetErrorMessage,
  signInErrorMessage,
  SIGN_IN_FALLBACK,
} from "./auth-errors";

describe("signInErrorMessage", () => {
  it("maps invalid credentials by code and by legacy message", () => {
    const expected =
      "Email or password is wrong. Try again or reset your password.";
    expect(signInErrorMessage({ code: "invalid_credentials" })).toBe(expected);
    expect(signInErrorMessage({ message: "Invalid login credentials" })).toBe(
      expected,
    );
  });

  it("maps an unconfirmed email", () => {
    expect(signInErrorMessage({ code: "email_not_confirmed" })).toMatch(
      /not confirmed/,
    );
    expect(signInErrorMessage({ message: "Email not confirmed" })).toMatch(
      /not confirmed/,
    );
  });

  it("maps rate limiting", () => {
    expect(signInErrorMessage({ status: 429 })).toMatch(/Too many attempts/);
    expect(signInErrorMessage({ code: "over_request_rate_limit" })).toMatch(
      /Too many attempts/,
    );
  });

  it("maps network failures", () => {
    expect(
      signInErrorMessage({ name: "AuthRetryableFetchError", status: 0 }),
    ).toMatch(/connection/);
    expect(signInErrorMessage({ message: "Failed to fetch" })).toMatch(
      /connection/,
    );
  });

  it("falls back for unknown errors without leaking the raw message", () => {
    const message = signInErrorMessage({ message: "db exploded: pg_xyz" });
    expect(message).toBe(SIGN_IN_FALLBACK);
    expect(message).not.toMatch(/pg_xyz/);
  });
});

describe("resetErrorMessage", () => {
  it("maps rate limit, network and unknown errors", () => {
    expect(resetErrorMessage({ code: "over_email_send_rate_limit" })).toMatch(
      /Too many requests/,
    );
    expect(resetErrorMessage({ message: "Failed to fetch" })).toMatch(
      /connection/,
    );
    expect(resetErrorMessage({ message: "boom" })).toBe(
      "Could not send a reset link. Try again in a minute.",
    );
  });
});

describe("passwordUpdateErrorMessage", () => {
  it("maps known codes and hides raw text", () => {
    expect(passwordUpdateErrorMessage({ code: "same_password" })).toMatch(
      /not using now/,
    );
    expect(passwordUpdateErrorMessage({ code: "weak_password" })).toMatch(
      /easy to guess/,
    );
    expect(passwordUpdateErrorMessage({ message: "Failed to fetch" })).toMatch(
      /connection/,
    );
    expect(passwordUpdateErrorMessage({ message: "pg_xyz" })).toBe(
      "Could not update your password. Try again in a minute.",
    );
  });
});

describe("oauthErrorMessage", () => {
  it("never shows provider text", () => {
    expect(oauthErrorMessage({ message: "provider is not enabled" })).toBe(
      "Could not sign in with Google. Try again in a minute.",
    );
    expect(oauthErrorMessage({ message: "Failed to fetch" })).toMatch(
      /connection/,
    );
  });
});
