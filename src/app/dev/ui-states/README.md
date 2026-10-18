# ui-states

## Purpose

Renders dashboard components in states that need data or a failure to
appear, without a session or database, so `e2e/dashboard-states.spec.ts`
can check them in a real browser. Not a vendor page.

## Contents

- `layout.tsx` — calls `notFound()` when `VERCEL_ENV === "production"`,
  marks the pages `noindex`, and wraps them in a plain `<main>` with a
  "Development preview" label (`data-testid="ui-states-frame"`).
- `unrouted/` — `/dev/ui-states/unrouted`: the overview's
  `UnroutedJobsNotice` for one job and for three — see its own README.
- `error/` — `/dev/ui-states/error`: a Server Component that throws while a
  cookie is set, caught by the real dashboard error page — see its own
  README.
- `ui-states.dom.test.tsx` — the production 404, the frame, both notice
  counts, and the error page throwing and recovering by cookie.

## Connectivity

The proxy only guards `/dashboard/*`, so these routes need no session.

## Parent

[dev](../README.md)
