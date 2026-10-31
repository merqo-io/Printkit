# dashboard

## Purpose

The authenticated vendor area (`/dashboard/*`).

## Contents

- `layout.tsx` — `DashboardLayout`, the ancestor of every route below.
  Gates access via `getVendorSession()` (`@/lib/vendor-session`, which also
  bounces a stale legal acceptance to `/legal/accept`), resolves
  the vendor's stall name via `getOrCreateVendorProfile`
  (`@/lib/merqo-vendor-profile`), then wraps `children` in
  `dashboard-nav.tsx`'s `DashboardNav` and a `max-w-7xl` `<main>`, followed by
  a `<footer>` rendering `@merqo/ui`'s `LegalFooterLinks` — printkit has no
  public landing page for a marketing footer to live on, so the Terms/Privacy
  links live in the dashboard shell instead.
  The layout is a full-height column: nav, `main` (grows to fill), then
  `SiteFooter`, so the footer sits at the bottom of short pages instead of
  under the content. Nav and footer are hidden when printing.
- `loading.tsx` — the placeholder shown while a dashboard page reads printers and jobs on the server: header and two panel-shaped blocks, announced as `role="status"`.
- `error.tsx` — the error fallback for dashboard pages. It renders inside the layout, so the nav and footer stay, with "Try again" and a link back to the overview, and logs the error with `console.error`. "Try again" calls `retry()`, which re-fetches the failed segment from the server; `reset()` only re-renders the cached payload, so a Server Component error would come straight back. It does not catch an error thrown by `layout.tsx` itself: that reaches the root `src/app/error.tsx`. Proven in a real browser by `e2e/dashboard-states.spec.ts` through `src/app/dev/ui-states/`.
- `dashboard-nav.tsx` — `DashboardNav`: composes `@merqo/ui`'s shared
  `DashboardNav`/`AccountMenu` — same shared-component contract every
  sibling kit uses. Owns the printkit wordmark, the Overview/Printers/History
  nav links, active-route highlighting, and thin throw-adapting wrappers
  around `submitFeedbackAction`/`submitSupportMessageAction`
  (`@/app/actions/{feedback,support}`), which both return a
  `{success, error}` result rather than throwing, while the shared
  component's `onSubmit`/`onFeedbackSubmit` contract needs a promise that
  rejects on failure. `vendor.subtitle` (not just `vendor.name`, which
  only feeds the avatar's initials) carries the visible vendor name — see
  `AccountMenuProps` in `@merqo/ui`. No plan/tier/tour concept exists in
  printkit yet, so those optional shared-component props are omitted.
- `page.tsx` — the Overview: a "Needs a booth" `Notice` when unrouted jobs exist, the first-run panel until a label has printed, one `PrinterStatusRow` per booth (with a "Design label" link to the designer) in a `Panel`, and the five most recent jobs. `hasPrintedJob` (`@/lib/print-jobs-list`) decides whether the last first-run step is done, so a printed job older than the five shown still counts. Its title (page heading and tab title) matches the nav label.
- `first-run-panel.tsx` — `FirstRunPanel`: three numbered steps (booth, printer, first label) with done marks; the first open step gets the magenta mark. Renders nothing once all three are done. Step 1 links to qkit only when `NEXT_PUBLIC_QKIT_URL` is an http(s) URL.
- `auto-refresh.tsx` — `AutoRefresh`: client component that calls `router.refresh()` on window focus / `visibilitychange` and every 30 s, never while the tab is hidden. Reusable on other pages.
- `unrouted-jobs-notice.tsx` / `unrouted-jobs-notice.dom.test.tsx` — `UnroutedJobsNotice`: the warning `Notice` whose linked "Needs a booth (N)" leads to `/dashboard/history?unrouted=1`, followed by a plain sentence saying those orders did not print. Renders nothing for a count of zero. Also rendered by `src/app/dev/ui-states/unrouted/` for the e2e check.
- `dashboard-nav.dom.test.tsx` — RTL/jsdom test: renders the wordmark and
  vendor name.
- `layout.dom.test.tsx` — RTL/jsdom test: renders the nav (mocked) with
  the vendor's stall name, plus the page `children`.
- `job-status-badge.tsx` / `job-status-badge.dom.test.tsx` — shared status
  badge (queued/sent/printed/failed) used by `history/`'s table. Renders via
  `@merqo/ui`'s shared `StatusBadge` (dot + bordered pill), replacing the old
  plain shadcn `Badge`; each status's `className` maps to this repo's own
  brand tokens (`magenta`/`destructive`/`flow`/`secondary`) rather than raw
  Tailwind color literals.
  Status colours: queued `secondary`, sent `info-text`, printed `success-text`, failed `destructive`.
- `page.tsx` / `page.dom.test.tsx` — dashboard overview: fetches
  `listActiveLocations` (`@/lib/print-locations`) and renders one
  `PrinterStatusRow` per active location (empty-state message when there are
  none), a qkit connection info card, an unrouted-print-jobs callout (from
  `countUnroutedJobs`, `@/lib/print-jobs-list`) linking to
  `/dashboard/history?unrouted=1` when the count is above zero, and recent
  print jobs via `JobHistoryTable` (limited to 5 jobs), passing the same
  `listActiveLocations` result down so unrouted rows get an assign control.
- `history/` — vendor-facing print job history — see its own README.
- `bridge/` — Bridge-mode runtime (Web Bluetooth pairing, auto-print,
  presence, wake lock) — see its own README.
- `dev/virtual-printer/` — a printer made of HTML that speaks the real
  CloudPRNT exchange against the real endpoint, so the print path can be
  tested without hardware. Unlinked from the nav and 404 in production —
  see its own README.

## Connectivity

`src/proxy.ts` runs `updateSession` (session refresh + `/dashboard/*` →
`/login` redirect) on every request via `src/lib/supabase/middleware.ts`,
ahead of this `layout.tsx`'s own `getVendorSession()` check.
`dashboard-nav.tsx`'s sign-out button calls `actions/auth.ts`'s
`signOutAction`, passed down from `layout.tsx`.
`page.dom.test.tsx`'s `listActiveLocations` mocks now include each
location's `source_ref`, matching `@/lib/print-locations`' return shape —
see `bridge/README.md` for what reads it.

## Parent

[app](../README.md)

Overview and printers pages share `listLocationPrinterSummaries`, which batches the verified vendor's active-booth printer summaries instead of one query per booth.
