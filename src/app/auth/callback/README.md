# auth/callback

## Purpose

The Supabase auth callback (`GET /auth/callback`). Google sign-in, the
sign-up confirmation link and the password-reset link all land here with a
one-time `code`.

## Contents

- `route.ts` — `GET`: exchanges `code` for a session
  (`exchangeCodeForSession`), then redirects to `next` on this origin.
  `next` is read through `safeRedirectPath` (`@/lib/safe-redirect`), so an
  absolute URL, a `//host`, a backslash path or one with a control
  character falls back to `/dashboard`. A missing `code` or a failed
  exchange redirects to `/login?error=oauth`.
- `route.test.ts` — the default and `next` redirects, each unsafe `next`
  shape, a deep link with a query string and fragment, and both failure
  paths.

## Connectivity

`src/app/login/page.tsx` builds the URL that leads here: `next` is the page
a signed-out vendor first asked for, or `/reset-password` for a recovery
link.

## Parent

[app](../../README.md)
