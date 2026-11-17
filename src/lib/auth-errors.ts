/** The slice of a Supabase `AuthError` the mapping reads. */
export interface AuthErrorLike {
  message?: string;
  code?: string;
  status?: number;
  name?: string;
  reasons?: readonly string[];
}

/** Shown beside the new-password field; mirrors the production Supabase policy. */
export const PASSWORD_REQUIREMENTS_HINT =
  "Use at least 8 characters, with a lowercase letter, an uppercase letter, a number and a symbol.";

export const SIGN_IN_FALLBACK = "Could not sign in. Try again in a minute.";

const INVALID_CREDENTIALS =
  "Email or password is wrong. Try again or reset your password.";
const EMAIL_NOT_CONFIRMED =
  "Your email is not confirmed yet. Check your inbox for the confirmation link.";
const RATE_LIMITED = "Too many attempts. Wait a few minutes and try again.";
const NETWORK = "Could not sign in. Check your connection and try again.";

function isNetworkError(error: AuthErrorLike): boolean {
  return (
    error.name === "AuthRetryableFetchError" ||
    error.status === 0 ||
    /failed to fetch|network/i.test(error.message ?? "")
  );
}

/**
 * Maps a Supabase auth error to short copy that says what to do next. Raw
 * messages can leak provider wording or internals, so anything unrecognised
 * gets the generic fallback rather than being shown as is. Codes are matched
 * first because they are stable; message matching covers older responses that
 * carry no code.
 */
export function signInErrorMessage(error: AuthErrorLike): string {
  const code = error.code ?? "";
  const message = error.message ?? "";

  if (
    code === "invalid_credentials" ||
    /invalid login credentials/i.test(message)
  )
    return INVALID_CREDENTIALS;
  if (code === "email_not_confirmed" || /email not confirmed/i.test(message))
    return EMAIL_NOT_CONFIRMED;
  if (
    code === "over_request_rate_limit" ||
    code === "over_email_send_rate_limit" ||
    error.status === 429 ||
    /rate limit/i.test(message)
  )
    return RATE_LIMITED;
  if (isNetworkError(error)) return NETWORK;
  return SIGN_IN_FALLBACK;
}

/** Same mapping for the reset-link request, which shares the rate limits. */
export function resetErrorMessage(error: AuthErrorLike): string {
  if (
    error.code === "over_email_send_rate_limit" ||
    error.code === "over_request_rate_limit" ||
    error.status === 429 ||
    /rate limit/i.test(error.message ?? "")
  )
    return "Too many requests. Wait a few minutes and try again.";
  if (isNetworkError(error))
    return "Could not send a reset link. Check your connection and try again.";
  return "Could not send a reset link. Try again in a minute.";
}

const CHARACTER_SETS = [
  { chars: "abcdefghijklmnopqrstuvwxyz", label: "a lowercase letter" },
  { chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", label: "an uppercase letter" },
  { chars: "0123456789", label: "a number" },
] as const;

function joinWithAnd(items: string[]): string {
  if (items.length < 2) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function lengthMessage(message: string): string {
  const min = /at least (\d+) characters/i.exec(message)?.[1];
  return min
    ? `Password is too short. Use at least ${min} characters.`
    : "Password is too short. Use a longer one.";
}

function charactersMessage(message: string): string {
  const listed = /character of each:([\s\S]*)$/i.exec(message)?.[1];
  if (listed) {
    const named: string[] = CHARACTER_SETS.filter(({ chars }) =>
      listed.includes(chars),
    ).map(({ label }) => label);
    const rest = CHARACTER_SETS.reduce(
      (left, { chars }) => left.replace(chars, ""),
      listed,
    );
    if (rest.replace(/[\s,.]/g, "")) named.push("a symbol");
    if (named.length) return `Password must include ${joinWithAnd(named)}.`;
  }
  return "Password needs a wider mix of characters, such as upper and lower case letters, numbers and symbols.";
}

/**
 * Turns a Supabase weak-password rejection into copy naming the failed rules.
 * The numbers and character classes come from the server's message, so the
 * copy follows whatever policy that environment enforces.
 */
export function weakPasswordMessage({
  reasons,
  message = "",
}: {
  reasons?: readonly string[];
  message?: string;
}): string {
  const found = reasons?.length
    ? reasons
    : [
        ...(/at least \d+ characters/i.test(message) ? ["length"] : []),
        ...(/character of each/i.test(message) ? ["characters"] : []),
      ];
  const parts = found.flatMap((reason) => {
    if (reason === "length") return [lengthMessage(message)];
    if (reason === "characters") return [charactersMessage(message)];
    if (reason === "pwned")
      return [
        "This password has appeared in a data breach. Choose a different one.",
      ];
    return [];
  });
  return parts.length
    ? parts.join(" ")
    : "That password is too weak. Choose a longer, less common one.";
}

/** Maps a rejected password update; raw text is never shown. */
export function passwordUpdateErrorMessage(error: AuthErrorLike): string {
  if (error.code === "same_password")
    return "Pick a password you are not using now.";
  if (
    error.code === "weak_password" ||
    /weak|easy to guess/i.test(error.message ?? "")
  )
    return weakPasswordMessage({
      reasons: error.reasons,
      message: error.message,
    });
  if (isNetworkError(error))
    return "Could not update your password. Check your connection and try again.";
  return "Could not update your password. Try again in a minute.";
}

/** Google sign-in failures never show provider text. */
export function oauthErrorMessage(error: AuthErrorLike): string {
  if (isNetworkError(error))
    return "Could not sign in with Google. Check your connection and try again.";
  return "Could not sign in with Google. Try again in a minute.";
}
