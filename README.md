# printkit

Hardware print connector for Merqo vendors. Prints a label for every
order, through one of three connectors (`src/lib/connectors/`):
`cloud_poll` for printers that fetch their own jobs (Star CloudPRNT),
`vendor_cloud` for printers reached through their maker's cloud (Feie 4G),
and `bridge` for Bluetooth printers (NIIMBOT B1) through Bridge mode in
Chrome on an Android phone, a Windows laptop or a Mac, or the Raspberry Pi
agent in `bridge-agent/`. An iPad cannot drive a Bluetooth printer at all
(no Web Bluetooth, WebUSB or Web Serial on iOS), verified on a B1 on
2026-09-22. Supported models
live in a static catalog (`src/lib/printer-catalog.ts`), which also holds
the recommendation order: iPad-alone printers with no monthly cost first
(cheapest first), 4G printers second, Bluetooth last; labels are laid out
once (`src/lib/label-layout.ts`) and rendered per driver, a PNG for most,
Feie's own markup for Feie. Architecture is job-type-agnostic for later job
types (receipt, kitchen-ticket, shelf-label, invoice). Internal-only —
reached through a vendor's existing sibling-kit relationship (qkit today),
no public marketing site or pricing; `/` redirects straight to
`/dashboard`. `POST /api/v1/print-jobs` accepts an optional `job_type`
field (the DB still only allows `'label'` for now). The outbound
print-status callback is kit-agnostic too — configured per calling kit in
`kit_api_keys` (`callback_url`/`callback_secret`), not hardcoded to qkit.
Its body names the job `source_ref`, with `order_id` kept beside it until
every calling kit reads the new name. `GET /api/v1/print-locations/status`
also returns `manage_url`, the printkit page for that location, so a calling
kit links to it instead of building printkit paths.
`GET /api/merqo/vendor-activity` (bearer `MERQO_METRICS_SECRET`) gives merqo's
admin vendor page a vendor's printer and job activity plus recent failures
from the `ops_events` log (30-day retention).
`next.config.ts` keeps `@napi-rs/canvas` (the label rasterizer's native
module) out of the bundle and traces `src/assets/fonts/` into every API
route.

Use Node 24 and pnpm 11.10.0 (the `packageManager` pin) for reproducible installs.
The build allowlist grants only the locked shared-UI commit, esbuild and
unrs-resolver; Sharp uses optional prebuilt packages without an install script.

See `AGENTS.md` for the full stack, commands, and data model. A vendor can
pair a separate physical bridge/printer to each of their booths, not just
one shared bridge per vendor — see `print_locations` in `AGENTS.md`'s
data model section. The bridge page also accepts a `?booth=<id>` deep link
(matched against a location's `source_ref`) so a calling kit — qkit's booth
settings today — can send a vendor straight to one booth's pairing panel;
see `src/app/dashboard/bridge/README.md`. Bluetooth pairing refuses a booth that is configured for a different printer, so a B1 never stands in for it.

Design: `docs/superpowers/specs/2026-08-21-printkit-v0.1-design.md`,
`docs/superpowers/specs/2026-08-23-printkit-location-routing-design.md`,
`docs/superpowers/specs/2026-09-20-printer-connectors-design.md`

Deploy and staging (`printkit-staging.merqo.io`, previews on the shared staging
Supabase project, `scripts/staging-migrate.sh`): `docs/DEPLOY.md`.

Migration `0015_fk_indexes.sql` indexes the foreign keys the Supabase advisor
flagged; it is safe to re-run.

`next` is pinned to `16.3.8` and `vitest` to `4.1.11` (see `CHANGELOG.md`
for the security context). The Vercel build does not use
`output: "standalone"`; that config was dropped.

The Overview shows three first-run steps (booth, printer, first label) until a label has printed, refreshes itself on tab focus and every 30 seconds while visible, and links each booth to its label designer. Set the optional `NEXT_PUBLIC_QKIT_URL` (see `.env.example`) before building to make the first step link to qkit.

The Printers page lets a vendor remove or swap a booth's printer (with a confirm), regenerate a cloud printer's address, edit a Feie SN and KEY, and reach the designer. Overview and printers share a vendor-scoped batch loader. Connector setup flows live in separate local components; history uses shared DataTable with Printkit-specific action eligibility.

Each page sets its own `metadata.title`, which the root layout's template turns into "<title> | printkit" (lowercase, like every mention outside the wordmark). Public pages open with the shared `LandingNav` (`SiteNav`) and a dashboard page's way back is the shared `BackButton`. The footer is the family's shared `@merqo/ui` `Footer`, through `src/components/site-footer.tsx`, and `/about` renders the shared `AboutMerqo` story. Every dashboard page is built from the shared parts in `src/components/` (`PageHeader`, `Panel`, `Notice`, `Steps`, `TextLink`), and colour comes from the tokens in `src/app/globals.css`, including the `success`/`warning`/`info` status tokens, never from raw Tailwind colours. Rows that pair a name with a status, like `PrinterStatusRow`, stack below the `sm` breakpoint so they fit a phone. A Bluetooth bridge reports its booth online only while a printer is actually paired, its test print runs one at a time, and leaving the page while a printer is paired asks first. A dashboard error shows inside the dashboard (`src/app/dashboard/error.tsx`); both error pages' "Try again" re-fetches from the server, and a malformed history cursor falls back to the newest page.
Shared dashboard nav/account menu, and `JobStatusBadge`'s shared
`StatusBadge` shape, come from `@merqo/ui`
(`github:merqo-io/merqo-ui#7b386558af36a1cbf008a9b4c4073c07ffc105ba`, tagged `v0.34.2`, `package.json`; `pnpm-workspace.yaml` allows its build for that commit only). Its help icons take taps through a 44px touch area on touch devices, and a long tooltip wraps inside the viewport; where a help icon follows a button (Bluetooth setup) it carries a small margin so that area stays off the button. This audited source includes shared client-boundary and account-menu hardening; login uses its shared `GoogleMark` instead of a local copy. Earlier releases added
`DashboardTours`, a route-matched multi-tour router for kits with more than
one dashboard-page tour; purely additive, this kit's own `DashboardTour`
usage is unchanged; bumped again 2026-09-16 for per-kit terms-schedule
scoping and the founder's public-name fix, see below). The dashboard shell
also gates a signed-in vendor on a current terms/privacy acceptance
(`/legal/*`, own README) before rendering, redirecting a stale vendor to
`/legal/accept` — see `src/app/legal/README.md`. As of `v0.24.0`,
`TermsAcceptanceCheckbox` no longer collects a typed legal name — just the
agree checkbox.

`/legal/terms` now renders only printkit's own Annex schedule
(`<LegalDocument doc="terms" kit="printkit" />`), not every sibling kit's —
previously every kit's `/legal/terms` page showed the full multi-kit annex
since none passed kit context. `legal/accept/actions.ts`'s recorded
`doc_sha256` hashes that same scoped content.

Brand theme is "Ink and paper" (black-ink primary on receipt paper, warm-grey
secondary, process-magenta accent) — see `src/app/globals.css`'s own header comment.

A vendor can now reprint an already-`printed` label, not just a `failed`
one — see `src/app/dashboard/history/README.md`'s `reprintJob` entry.
Reprint first asks "Print this label again?" so a double tap cannot queue two
labels, and a failed job in History explains its `failure_reason` in plain
words. The printer picker cards show only the essentials, with the rest behind
a "Details" disclosure.

`/reset-password` shows its form only to the session a fresh reset link
created, within 15 minutes, through a signed recovery-window cookie set by
`/auth/callback`. Any other signed-in session gets the expired card. See
`src/app/reset-password/README.md`.

Every Supabase `redirectTo` is the bare `/auth/callback` URL, since the
shared project honours only an exact allowed Redirect URL. The login page's
return path travels in the `printkit_auth_next` cookie; see
`src/app/auth/callback/README.md`.

`e2e/` holds the Playwright public smoke, auth-guard and dashboard-states specs, run with `pnpm test:e2e` (see its own README).

A signed-out vendor who opens a dashboard link is returned to it after
sign-in: the proxy records the path as `next` on `/login`, and the login
page and `/auth/callback` honour it for same-origin paths only (see
`src/app/login/README.md`).

Audit progress and validation limits are recorded in
[the October 2026 audit](docs/audits/2026-10-08-printkit-audit.md).
Device result handlers report persistence failures and recheck delivery state
in the update. Feie callbacks also bind the update to the signed attempt ID.

The AI harness follows templateCentral 6.0.4: hook commands are anchored on the project directory, and the guard against committing to `main` reads the branch of the directory a command runs in. The dated entry in `AGENTS.md` lists what was adopted.

## Security headers

`src/proxy.ts` sets the CSP (nonce on per-request routes) and `X-Robots-Tag` off production; see `docs/security/`.

## Lint

`eslint.config.mjs` consumes the shared `@merqo/ui/eslint` preset (comment and directive hygiene, size and complexity limits, no colour literals or em dashes in `src`). `eslint.config.test.ts` asserts the key rules stay at `error`. Colour literals are allowed only in `src/lib/brand-icon.tsx`.

## Multi-label batch candidate

The `label_batch` API creates one ordinary job per item unit and reports terminal status for the whole order. Migration 0011 must be applied before rollout. See [the specification](docs/superpowers/specs/2026-10-29-multi-drink-labels.md) for compatibility, retry semantics and the pending Kopitiam Cart physical acceptance checklist.

The Bluetooth bridge provides an optional 40 by 60 mm calibration preview and an explicitly initiated single-label sample print.

The sticker designer prototype supports configurable label geometry and a non-printing renderer preview; saved designs now print on live label jobs. Long text fits its box (wrap, shrink, then ellipsis), and a job falls back to the default label if the design cannot render. A vendor can upload one PNG or JPEG logo (up to 512 KB and 1024 by 1024 pixels) into the private `sticker-logos` storage bucket and place it on the sticker; the logo prints as a dithered 1-bit image and is drawn in the designer print preview, and a missing or unreadable logo is skipped without failing the job. A design is scaled to the printer's label size (contain, centered), the designer warns when the sizes differ, and Feie printers keep the standard label.
