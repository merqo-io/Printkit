# login

## Purpose

The sign-in page (`/login`) — email+password and Google
OAuth, plus password reset. There is no sign-up: a footer line says printkit is the print companion for qkit booths and new vendors start with qkit. `/reset-password` completes emailed recovery links.

## Contents

- `layout.tsx` — a pass-through server layout that sets the tab title "Sign in"; `page.tsx` is a client component and cannot export `metadata`.
- `page.tsx` — `LoginPage()` wraps the actual `LoginForm` client component
  in `<Suspense>` (it reads `useSearchParams()` for `?error=oauth`).
  `LoginForm` handles:
  - Google OAuth via `supabase.auth.signInWithOAuth`, redirecting through
    `/auth/callback`; `queryParams: { hl: "en" }` forces an English consent
    screen regardless of the visitor's browser/account locale.
  - Email+password sign-in via `supabase.auth.signInWithPassword`.
  - "Forgot password?" calls
    `supabase.auth.resetPasswordForEmail`, toasting an error if the email
    field is empty or the call fails, and a success toast otherwise. The
    reset link lands on the bare `/auth/callback` URL, which recognises the
    recovery exchange, opens a 15-minute recovery window and forwards to
    `/reset-password`.
  - `Wordmark` (`@/components/wordmark`) and `GoogleMark`
    (`@merqo/ui`) brand the card; the card container is `ElevatedCard`
    (`@/components/elevated-card`), matching every other kit's login page.
  - The return path. `returnPath()` reads `?next=` through
    `safeRedirectPath` (`@/lib/safe-redirect`), so an absolute URL, a
    `//host` or a backslash path falls back to `/dashboard`. Password
    sign-in pushes to it. Google sign-in
    sends the bare `/auth/callback` URL as `redirectTo`
    (`authCallbackUrl()`): Supabase honours only an exact allowed Redirect
    URL, and with a query string it fell back to the shared project's Site
    URL (merqo). The return path rides in the `printkit_auth_next` cookie
    instead (`@/lib/auth-return`: `Path=/auth`, ten minutes, `SameSite=Lax`,
    `Secure` on https), which the callback checks again. Without a `next`
    the cookie is cleared. A fragment on the login URL
    (`#booth-<id>`) is put back on a valid `next`: the server never sees a
    fragment, but the browser keeps it across the proxy's redirect here.
- `page.test.tsx` — RTL/jsdom tests: the `?error=oauth` banner, the
  qkit pointer replacing sign-up, a rejected password sign-in showing its error, and the Forgot password flow (sends a
  reset email, toasts an error on an empty email or a failed reset call).
  Also the return path: a valid `next` is honoured by password sign-in and
  saved in the cookie for Google sign-in, every flow (reset included) sends
  the bare callback URL, an unsafe `next` falls back to `/dashboard` and
  saves nothing, and a fragment is kept.
- `login-page.dom.test.tsx` — RTL/jsdom test asserting the page renders a
  single top-level heading alongside the Google and email/password form.

## Connectivity

Signed-out visitors reach `/login` directly (the landing page,
`src/app/page.tsx`, redirects to `/dashboard`, whose auth gate sends signed-out visitors to `/login`). A
signed-out request for any other dashboard page arrives as
`/login?next=<path and query>`, set by `updateSession`
(`src/lib/supabase/middleware.ts`). On success the page calls
`router.push(returnPath())` + `router.refresh()`: the page named by `next`,
or `/dashboard` without one. `/dashboard`'s `layout.tsx`
(`getVendorSession()`) is the actual auth gate this page's happy path leads
into.

## Parent

[printkit](../../../README.md)

Unexpected OAuth or password request failures restore the controls and retain credentials for retry. Successful navigation retains the pending state while leaving the page.

`layout.tsx` also forces per-request rendering so the nonce CSP from `proxy.ts` reaches this page's scripts.
