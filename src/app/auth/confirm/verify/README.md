# auth/confirm/verify

## Purpose

The POST-only route behind `/auth/confirm` (`POST /auth/confirm/verify`). It
spends the emailed `token_hash` with `verifyOtp` and redirects with a 303.

## Contents

- `route.ts` — `POST` via `handleAuthConfirm` (`@merqo/ui/auth`), with the
  server Supabase client, `/dashboard` as the default return path and
  `/reset-password` as the recovery path. A cross-origin post or a failed
  verification redirects to `/login?error=link`. `next` comes only from the
  form field; the `printkit_auth_next` cookie is neither read nor cleared
  here. For a recovery link, `onRecovery` validates the verify result with Zod
  and calls `setRecoveryWindowCookie` (`@/lib/recovery-window`), the helper
  `../../callback/` also uses, so the `printkit_recovery` cookie is identical.
  If the session id cannot be read, no cookie is set and the redirect still
  goes to `/reset-password`, as in the callback.
- `route.test.ts` — the default and `next` redirects, the recovery window and
  its cookie (also when the session id or session is missing), the failure
  redirect, a cross-origin post and that only POST is exported.

## Connectivity

Posted to by the form on [`../page.tsx`](../README.md).

## Parent

[confirm](../README.md)
