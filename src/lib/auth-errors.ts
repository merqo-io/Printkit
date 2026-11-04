/** The slice of a Supabase `AuthError` the mapping reads. */
export interface AuthErrorLike {
  message?: string;
  code?: string;
  status?: number;
  name?: string;
}

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

/** Maps a rejected password update; raw text is never shown. */
export function passwordUpdateErrorMessage(error: AuthErrorLike): string {
  if (error.code === "same_password")
    return "Pick a password you are not using now.";
  if (
    error.code === "weak_password" ||
    /weak|easy to guess/i.test(error.message ?? "")
  )
    return "That password is too easy to guess. Try a longer one.";
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
