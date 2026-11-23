# dashboard/[...slug]

## Purpose

Catch-all for unknown `/dashboard/*` URLs.

## Contents

- `page.tsx` — calls `notFound()` (noindex metadata). A segment's `not-found.tsx` only catches `notFound()` thrown inside that segment, so without this an unmatched URL fell to the root not-found and lost the dashboard nav and header. Real routes (`printers`, `history`, `bridge`, ...) are more specific and win over the catch-all.
- `page.test.tsx` — asserts the page calls `notFound()`.
