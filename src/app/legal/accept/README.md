# accept

## Purpose

The legal-acceptance interstitial a signed-in vendor is redirected to when
their accepted terms/privacy versions are behind `@merqo/ui`'s
`LEGAL_VERSIONS`. printkit owns no acceptance record — merqo does — so this
folder's job is entirely to collect the vendor's consent and forward it.

## Contents

- `page.tsx` — `LegalAcceptPage`. Reads the `next` search param (through
  `safeRedirectPath`, `@merqo/ui`) and renders `@merqo/ui`'s `AuthShell` around its `AcceptTermsForm`.
  Deliberately runs no legal-gate check itself — it is what the gate
  redirects to, so gating it would loop.
  Tab title "Accept the updated terms".
- The form is `@merqo/ui`'s `AcceptTermsForm` (agree checkbox; "Accept and
  continue" is disabled until it's checked and posts to `acceptLegalTerms`).
  A separate "Sign out instead" form in the `AuthShell` footer posts to
  `signOutAction` (`@/app/actions/auth`), so a visitor who declines is not
  stuck on this page. `AcceptTermsPage` is not used: it has no slot for that
  exit.
- `actions.ts` — `acceptLegalTerms` server action. Re-checks for a signed-in
  user (redirects to `/login` otherwise), reads the vendor's real
  `ip` (shared `clientIp`, trusting `x-vercel-forwarded-for` then the last
  `x-forwarded-for` hop, never the spoofable first one) and `user_agent`, then
  posts through `createMerqoClient` to `/api/merqo/legal-accept` on merqo once
  per doc type (`terms`, `privacy`), each independent so a
  duplicate-acceptance conflict on one never blocks the other. The
  recorded `doc_sha256` hashes `getLegalDocSource(docType, "printkit")` —
  the same kit-scoped content `terms/page.tsx` actually renders, not the
  full multi-kit annex. On success it primes the local `legal_check_state`
  cache (a failed cache write is logged, not fatal) and redirects to a `safeRedirectPath`-checked `next` (default
  `/dashboard`).
- `actions.test.ts` — covers the two independent posts, the cache prime,
  `next`-param safety, client IP selection, the no-user/missing-secret branches, and a
  non-2xx throw.

## Parent

[legal](../README.md)

Regression fixtures restore environment and transport mocks between tests so missing-configuration and failure cases cannot leak state into later cases.

The `next` form field is length-checked by Zod before `safeRedirectPath` runs.

The Merqo base URL comes from the shared `merqoBaseUrl()` from `@merqo/ui/kit-api`.

The sign-out button takes `Button` from `@merqo/ui/primitives`.
