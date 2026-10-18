# e2e

## Purpose

Playwright end-to-end smoke tests. They need only `pnpm dev` and
`playwright install`, with dummy Supabase values and no live database.

## Contents

- `smoke.spec.ts` — public smoke: `/login` renders its "Continue with Google"
  button, and the public `/guides/bluetooth-printers` guide renders its
  heading. printkit has no landing page (`/` redirects to `/dashboard`), so
  the guide stands in as the public page.
- `auth-guard.spec.ts` — signed-out route protection: `/` and `/dashboard`
  end at `/login`; a deeper dashboard link ends at `/login` with its path
  and query as `next`, and a fragment on it is still on the login URL.
  `src/proxy.ts`
  resolves `user: null` locally when there is no session cookie, so the
  redirect fires without a database.

- `dashboard-states.spec.ts` — dashboard UI that needs a session, checked
  through the development-only `/dev/ui-states/` routes
  (`src/app/dev/ui-states/`), which render the real components without one.
  The unrouted-jobs note reads as one sentence for one and for three jobs,
  with only the count phrase linked. The dashboard error page renders inside
  its layout, and "Try again" re-fetches the Server Component that threw: a
  cookie makes the page throw, the test clears it and clicks "Try again".
  Each test saves a screenshot (`unrouted-notice.png`,
  `dashboard-error.png`) to its `test-results/` folder.

## Connectivity

Run by `pnpm test:e2e` (`playwright.config.ts`, which starts `pnpm dev`) and
by the `e2e (public smoke)` job in `.github/workflows/ci.yml`. Vitest does
not pick these files up: its `include` covers `test/`, `src/` and
`bridge-agent/src/` only.

## Parent

[printkit](../README.md)
