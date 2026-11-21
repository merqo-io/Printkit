# terms

## Purpose

The public Terms of Service page.

## Contents

- `page.tsx` — `TermsPage`, a Server Component rendering `LegalPageClient`
  (`../legal-page-client.tsx`), which wraps `@merqo/ui`'s
  `<LegalPage doc="terms" kit="printkit" />`; metadata from `legalPageMetadata`. The `kit`
  prop scopes the rendered Annex to printkit's own schedule only, not every
  sibling kit's. Content lives in `@merqo/ui`, not here — see the parent
  README. Tab title "Terms of Service".

## Parent

[legal](../README.md)
