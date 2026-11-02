/**
 * The page to return to after a Google sign-in or a password-reset
 * link. It travels in a short-lived cookie scoped to `/auth` rather than as
 * `?next=` on the callback URL, because Supabase honours a `redirectTo` only
 * when it matches an allowed Redirect URL exactly; a query string makes it
 * fall back to the shared project's Site URL (another kit).
 */
export const AUTH_NEXT_COOKIE = "printkit_auth_next";
export const AUTH_NEXT_MAX_AGE = 600;
export const AUTH_NEXT_PATH = "/auth";

/**
 * A `document.cookie` assignment that saves `next`, or clears any saved value
 * when `next` is null. `secure` is false only on a plain-http dev origin.
 */
export function authNextCookie(next: string | null, secure: boolean): string {
  const value = next === null ? "" : encodeURIComponent(next);
  const maxAge = next === null ? 0 : AUTH_NEXT_MAX_AGE;
  return [
    `${AUTH_NEXT_COOKIE}=${value}`,
    `Path=${AUTH_NEXT_PATH}`,
    `Max-Age=${maxAge}`,
    "SameSite=Lax",
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}
