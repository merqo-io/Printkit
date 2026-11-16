# auth/confirm

## Purpose

The landing page for emailed links that carry a `token_hash` on this origin
(`GET /auth/confirm`). It shows a "Continue" form and never calls Supabase, so
an email scanner that follows the link cannot consume the one-time token.

## Contents

- `page.tsx` — server component. Reads `token_hash`, `type` and `next` through
  `readAuthConfirmParams` (`@merqo/ui/auth`) and renders `AuthConfirmForm`,
  which posts to `verify/`. A link without a usable token or type renders
  `AuthConfirmInvalid`. The page is `noindex` and sends
  `referrer: no-referrer`, so the token is not leaked in a `Referer` header.
- `page.dom.test.tsx` — the POST form carrying the token for a valid link, the
  invalid state, that the page never calls Supabase, and the `noindex` and
  no-referrer metadata.
- `verify/` — the POST route the form submits to.

## Connectivity

The form posts to [`verify/`](./verify/README.md), which verifies the token and
redirects. A failed verification lands on `/login?error=link`.

## Parent

[app](../../README.md)
