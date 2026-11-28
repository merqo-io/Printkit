# legal

## Purpose

The public legal-document pages and the acceptance interstitial. Content lives
in `@merqo/ui` (one source, shared by merqo and every kit); printkit only
routes to it and, on `accept/`, records the vendor's acceptance with merqo.

## Contents

- `legal-page-client.tsx` — `LegalPageClient`, a `"use client"` wrapper around
  `@merqo/ui`'s `LegalPage` (printkit wordmark linking home through
  `next/link`). It exists because the package bundle inlines the client-only
  `LegalDocument` without a client boundary, which 500s when `LegalPage`
  renders from a Server Component in production.
- `terms/page.tsx` — `TermsPage`, renders `LegalPageClient` with
  `doc="terms" kit="printkit"`; metadata from `legalPageMetadata`.
- `privacy/page.tsx` — `PrivacyPage`, the same for `doc="privacy"`.
- Tab titles: "Terms of Service", "Privacy Policy" and "Accept the updated terms".
- `accept/page.tsx` — `LegalAcceptPage`. The interstitial
  `getVendorSession` (`@/lib/vendor-session`) redirects a signed-in vendor to
  when their accepted terms/privacy versions are behind `@merqo/ui`'s
  `LEGAL_VERSIONS`. Reads the `next` search param (through
  `safeRedirectPath`, `@merqo/ui`) and renders `@merqo/ui`'s `AuthShell` around its `AcceptTermsForm`.
  Deliberately runs **no** legal-gate check itself — it is what the gate
  redirects to, so gating it would loop.
- The accept form is `@merqo/ui`'s `AcceptTermsForm` (agree checkbox, submit
  disabled until ticked, posts to `acceptLegalTerms`). The "Sign out instead"
  form lives in the `AuthShell` footer; `AcceptTermsPage` is not used because
  it has no slot for that exit.
- `accept/actions.ts` — `acceptLegalTerms` server action. Re-checks for a
  signed-in user (redirects to `/login` otherwise), reads the vendor's
  real `ip`/`user_agent` (via `headers()` and the shared `clientIp` from `@merqo/ui/kit-api`, which
  trusts only the last hop of `x-vercel-forwarded-for`/`x-forwarded-for`, since
  this action runs on the vendor's own browser submission), then `POST`s
  `/api/merqo/legal-accept` on merqo once per doc type (`terms`,
  `privacy`) — bearer-authed with `MERQO_CUSTOMER_SECRET`, `kit_slug:
"printkit"`, each body carrying the SHA-256 of that doc's
  `getLegalDocSource(...)`. Each call is independent, and merqo maps a
  duplicate `(email, doc_type, doc_version)` to a success, so a conflict
  on one doc never blocks the other. On success it primes the local
  `legal_check_state` cache to `is_current = true` and redirects to a
  `safeRedirectPath`-checked `next` (default `/dashboard`).
- `accept/actions.test.ts` — covers the two independent posts (asserting
  `ip`/`user_agent` land in both bodies), the cache prime, `next`-param
  safety (absolute / protocol-relative rejected), the no-user and
  missing-secret branches, and a non-2xx throw.

## Connectivity

printkit owns no acceptance record — merqo does (`merqo.legal_acceptances`).
The gate that sends vendors here lives in `@/lib/legal-gate`
(`requireCurrentLegalAcceptance`), wired into `getVendorSession`
(`@/lib/vendor-session`) — printkit's single vendor-gate entry point, called
from `dashboard/layout.tsx`. `terms/` and `privacy/` are also linked from the
dashboard shell's footer (`@merqo/ui`'s `LegalFooterLinks` in
`dashboard/layout.tsx`) — printkit's public landing is signed-out only, so
signed-in vendors get these links from the dashboard shell.

## Parent

[app](../README.md)
