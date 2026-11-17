import { describe, expect, it } from "vitest";
import {
  oauthErrorMessage,
  passwordUpdateErrorMessage,
  resetErrorMessage,
  signInErrorMessage,
  SIGN_IN_FALLBACK,
  weakPasswordMessage,
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
    expect(passwordUpdateErrorMessage({ code: "weak_password" })).toBe(
      "That password is too weak. Choose a longer, less common one.",
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

describe("weakPasswordMessage", () => {
  const SETS =
    "abcdefghijklmnopqrstuvwxyz, ABCDEFGHIJKLMNOPQRSTUVWXYZ, 0123456789";

  it("names the minimum length when the message carries it", () => {
    expect(
      weakPasswordMessage({
        reasons: ["length"],
        message: "Password should be at least 8 characters.",
      }),
    ).toBe("Password is too short. Use at least 8 characters.");
  });

  it("falls back when the length has no number", () => {
    expect(
      weakPasswordMessage({ reasons: ["length"], message: "Too short" }),
    ).toBe("Password is too short. Use a longer one.");
  });

  it("names the character classes listed in the message", () => {
    expect(
      weakPasswordMessage({
        reasons: ["characters"],
        message: `Password should contain at least one character of each: ${SETS}.`,
      }),
    ).toBe(
      "Password must include a lowercase letter, an uppercase letter and a number.",
    );
  });

  it("adds a symbol when a symbol set is listed", () => {
    expect(
      weakPasswordMessage({
        reasons: ["characters"],
        message: `Password should contain at least one character of each: ${SETS}, !@#$%^&*()_+-=[]{};':"|<>?,./~.`,
      }),
    ).toBe(
      "Password must include a lowercase letter, an uppercase letter, a number and a symbol.",
    );
  });

  it("uses a generic character message when the classes cannot be parsed", () => {
    expect(
      weakPasswordMessage({ reasons: ["characters"], message: "weak" }),
    ).toBe(
      "Password needs a wider mix of characters, such as upper and lower case letters, numbers and symbols.",
    );
  });

  it("explains a breached password", () => {
    expect(weakPasswordMessage({ reasons: ["pwned"] })).toBe(
      "This password has appeared in a data breach. Choose a different one.",
    );
  });

  it("joins several reasons with one space", () => {
    expect(
      weakPasswordMessage({
        reasons: ["length", "pwned"],
        message: "Password should be at least 10 characters.",
      }),
    ).toBe(
      "Password is too short. Use at least 10 characters. This password has appeared in a data breach. Choose a different one.",
    );
  });

  it("infers the rules from the message when reasons are missing", () => {
    expect(
      weakPasswordMessage({
        message: "Password should be at least 6 characters.",
      }),
    ).toBe("Password is too short. Use at least 6 characters.");
    expect(
      weakPasswordMessage({
        message: `Password should contain at least one character of each: ${SETS}.`,
      }),
    ).toMatch(/must include a lowercase letter/);
  });

  it("uses a generic message when nothing identifies the rule", () => {
    expect(weakPasswordMessage({})).toBe(
      "That password is too weak. Choose a longer, less common one.",
    );
  });
});
