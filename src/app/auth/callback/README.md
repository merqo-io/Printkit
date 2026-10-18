# auth/callback

## Purpose

The Supabase auth callback (`GET /auth/callback`). Google sign-in, the
sign-up confirmation link and the password-reset link all land here with a
one-time `code`.

## Contents

- `route.ts` — `GET`: exchanges `code` for a session
  (`exchangeCodeForSession`), then redirects on this origin. The return
  path is the `?next=` query param when present, else the
  `printkit_auth_next` cookie the login page set (`@/lib/auth-return`). It
  is read through `safeRedirectPath` (`@/lib/safe-redirect`), so an
  absolute URL, a `//host`, a backslash path or one with a control
  character falls back to `/dashboard`. Every response clears that cookie.
  A missing `code` or a failed exchange redirects to `/login?error=oauth`.
- A reset link's exchange returns `redirectType: "recovery"` (supabase-js
  reads it from the code verifier `resetPasswordForEmail` stored). Only
  that exchange goes to `/reset-password` and sets the `printkit_recovery`
  cookie (`@/lib/recovery-window`), bound to the new session's id from
  `getClaims()`. A Google or email sign-in never opens a recovery window,
  even with `next=/reset-password`. `redirectType` is not in supabase-js's
  declared return type, so it is read through a Zod schema.
- `route.test.ts` — the default and `next` redirects, each unsafe `next`
  shape, a deep link with a query string and fragment, both failure paths,
  the recovery window (only after a recovery exchange, with its cookie
  flags) and the return-path cookie (honoured, unsafe values rejected,
  always cleared, the query param preferred).

## Connectivity

`src/app/login/page.tsx` sends every flow here with the bare
`/auth/callback` URL, because Supabase honours only an exact allowed
Redirect URL. It carries the page a signed-out vendor first asked for in
the `printkit_auth_next` cookie.

## Parent

[app](../../README.md)
