# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Security

- `next` and `eslint-config-next` 16.3.8 to 16.4.2. next `>=16.0.0 <=16.4.0` has two critical unauthenticated remote code execution advisories, GHSA-2464-fhr4-w9xw (Image Optimization API with SVG files) and GHSA-673q-mjm6-r5xr (`use cache` functions returning typed arrays), and a high Server Actions denial of service, GHSA-p3m5-59mp-jv5r. They failed the dependency-audit job on every open PR. `pnpm audit --prod --audit-level=high` is clean again.

### Added

- Staging: Vercel `Preview` deployments use the shared staging Supabase project, and the `staging` branch is served at `printkit-staging.merqo.io`. `docs/DEPLOY.md` gains a Staging section (printkit's `Preview` values including `PRINTKIT_PUBLIC_URL`, Deployment Protection off, the staging-first gate for PRs that add a migration) and no longer says printkit has its own Supabase project. New `scripts/staging-migrate.sh` loads migrations into staging with psql (the kits share one migration history table with overlapping version numbers, so `supabase db push` cannot). `supabase/seed/staging-kit-keys.sql` registers qkit's staging key and callback. The `staging sync` workflow keeps `staging` on `main` and triggers the Vercel deploy hook. Full setup: merqo's `docs/STAGING.md`.
- The family footer (`@merqo/ui` `Footer`: wordmark, tagline, copyright, About and legal links) on the dashboard, the Bluetooth guide and a new public `/about` page, replacing the bare "Terms · Privacy" line. The dashboard footer sits at the bottom of short pages.
- A branded "Page not found" page and a loading placeholder for dashboard pages, so a stale setup link no longer lands on Next's default 404 and a slow page no longer shows nothing.
- Shared page parts in `src/components/` (`PageHeader`, `Panel`, `Notice`, `Steps`, `TextLink`) so every dashboard page has the same header, containers, callouts, numbered steps and link style.
- The history page says when it is showing only unrouted jobs and offers "Show all jobs".
- A real-browser check (`e2e/dashboard-states.spec.ts`) of the overview's unrouted-jobs note and the dashboard error page, through development-only `/dev/ui-states/` routes that return 404 in production.

- Playwright end-to-end smoke tests (`e2e/`, `pnpm test:e2e`): a public smoke spec and a signed-out auth-guard spec, run in CI as `e2e (public smoke)` against `pnpm dev` with dummy Supabase values. The job name and baseline match qkit, loopkit and merqo, so every kit can require the same check. `@playwright/test` is pinned to `1.61.1`.
- `GET /api/v1/print-locations/status` returns `manage_url`: the printkit page for that location (the picker when it has no printer, its row on the printers list when it has one). A calling kit links to it and no longer needs to know printkit's routes. The row such a link names is outlined on the printers list.
- The printer picker opens with a short note on which printers work with an iPad alone and what a Bluetooth-only printer needs, with a link to the guide. qkit drops its own copy of this advice in its matching change. A picker link that names a booth printkit cannot find no longer opens another booth's picker.
- The print-status callback body carries `source_ref` beside `order_id`, both holding the calling kit's reference. `order_id` will be removed in a later release, once calling kits read `source_ref`.

### Changed (shared UI)

- The public pages (`/about`, the Bluetooth guide) open with `@merqo/ui`'s `LandingNav` (new `SiteNav`) instead of a bare wordmark, and the guide has the shared `BackToTop` button. A dashboard page's way back ("Printers") is the shared `BackButton`, not a text link, like qkit, loopkit, paykit and stockkit. Not adopted: a landing page (`/` redirects to the dashboard; vendors arrive from qkit), `DashboardTour`, `Section`, `StatTile`, `AuditLogTable` (no matching screen).

### Fixed

- Leaving Bridge mode while a printer is paired now asks first. Following a dashboard link, reloading or closing the tab used to drop the Bluetooth connection silently, and orders stopped printing until someone came back and paired again. The browser back button still leaves without asking.
- "Try again" on the site-wide error page (sign-in, guides, every page outside the dashboard) re-fetches the page from the server, matching the dashboard error page. It used to re-render the failed result.
- "Try again" on the dashboard error page now re-fetches the page from the server. It used to re-render the failed result, so an error from the server came straight back.

### Changed

- Pin `@merqo/ui` to commit `7b386558af36a1cbf008a9b4c4073c07ffc105ba` (tag `v0.34.2`). Signing out no longer flashes a "NEXT_REDIRECT" error under the Sign out item: the shared `useAsyncAction` now treats a Next.js `redirect()` as navigation. The bump also brings v0.33.0–v0.34.1 (`DataCollectionNotice`, a BackButton styling fix), none of which printkit uses.
- Bridge mode's "Print test" prints one label per press. Tapping it repeatedly used to queue and print one label per tap; the button now reads "Printing test…" and is disabled until the label is done.
- Every page has its own browser-tab title, named after its heading ("Printers | printkit", "Sign in | printkit"), instead of "Printkit | Vendor Label Printing" on every route. "printkit" stays lowercase.
- The overview's unrouted-jobs note agrees with its count: "1 unrouted print job needs a booth assigned before it can print."
- In the printer picker, each card badge and its "i" button wrap onto the next line together, instead of the button landing alone on a new line.
- Bridge mode notices when the Bluetooth printer drops (switched off, out of range, or taken by another device), says so, and offers Reconnect. While no printer is paired, the booth no longer shows as online on the dashboard; before, Bridge mode being on was enough.
- On a phone, a booth's printer status sits under its name instead of running off the edge of the card.
- Bluetooth printer setup numbers its steps 1, 2, 3 before a helper device is chosen. It used to skip from 1 to 3.
- Bridge mode shows "Try again" after a failed pairing. Before, the only way to retry was to turn Bridge mode off and on.
- The overview no longer shows a fixed "Connected to qkit" card, which was not read from any data. Page titles now match the navigation ("Overview", "History").
- Colour tokens: neutrals take the warm paper hue, muted text and status colours clear 4.5:1, borders are visible, and status colours come from new `success`, `warning` and `info` tokens instead of raw Tailwind colours. The unused `ink` and `flow` tokens and `fade-rise` animation are removed.
- On touch screens, buttons, inputs, selects and filter chips are 40 to 48px tall.

- Internal: the AI harness follows templateCentral 6.0.4. Hook commands no
  longer depend on the shell's current directory, the end-of-turn test run
  is skipped when nothing changed, the guard against skipping git hooks
  closes six gaps and reads the branch of the directory a command runs in
  (so commits from a git worktree are not blocked by the main checkout's
  branch), and the pull-request doc gates fail when the base branch is
  missing. See the dated entry in `AGENTS.md`.
- Pin `@merqo/ui` to commit `9b202ba529dfd8fecbcbb9a2cc9f37efba4bd7d4` (tag `v0.32.3`) with matching build permission. Long info tooltips now wrap inside the screen instead of staying on one line that runs off a phone, and tests that import `@merqo/ui` no longer load about 3,400 Simple Icons modules. No tooltip here was long enough to run off the screen.
- Pin `@merqo/ui` to commit `a8063218e5954bef35242550070606628d79375a` (tag `v0.32.2`) with matching build permission. Every info icon now takes taps through a transparent 44px touch area on touch devices; the icon is drawn as before and nothing moves. Here the printer help icons, drawn at 24px, go from a 24px to a 44px target.
- Drop the leftover `allowBuilds` entry for the previous `@merqo/ui` commit, so build permission names only the pinned source URL.
- Pin `@merqo/ui` to commit `cb9dd39ab56d6bc2030d30edb7474ee8ebf60820` (tag `v0.32.1`) with matching build permission. From this revision, `Section` title tooltips and default-mode `InfoTooltip`s open on a tap as well as on hover and keyboard focus. Nothing changes for vendors here: printer help already opens on a tap.
- Reuse touch-first shared printer help with preserved target sizing and pin its tested immutable UI commit.

- Batch vendor printer summaries, reuse the shared history table and brand mark, and separate connector setup components for clearer ownership.

- Pin shared UI to audited commit `989d934c1cc8d957ff383934debf8ef083b6b6a4` and reuse its identical Google login icon, removing the local duplicate.

- Pin pnpm 11.10.0 and restrict dependency build permissions to the locked shared-UI commit and required native tooling, replacing placeholder permissions.
- The repository moved from the `cljiahao` GitHub account to the `merqo-io` organization. `@merqo/ui` now installs from `github:merqo-io/merqo-ui` at the same tag, with the lockfile and tarball URLs updated to match. The Bluetooth guide and the bridge agent README now clone from the new URL.
- The `secret scan (gitleaks)` CI job runs the pinned gitleaks release binary, verified against the release checksum, instead of `gitleaks-action`. The action is free only for personal-account repos and needs a paid license on organization-owned ones, so every run failed after the move to `merqo-io`. It scans the PR commits, or the pushed range on `main`.
- Bluetooth copy now names every device that can act as the helper: an
  Android phone, a Windows laptop or a Mac (Chrome on any of them), or a
  Raspberry Pi, and states plainly that an iPad or iPhone cannot, by cable
  or Bluetooth. Both facts were confirmed on a real B1 on 2026-09-22. The
  guide, the picker's "Needs a helper device" tip, the B1's catalog note,
  the setup wizard and the Bridge page all say the same thing.

### Fixed

- `/reset-password` only lets someone set a new password within 15 minutes of opening a fresh reset link, on the session that link created. Before, any signed-in session (such as a stall iPad left signed in) could set a new password without the current one. `/auth/callback` now sets a signed, httpOnly recovery-window cookie only after a reset link's code exchange (Supabase's `redirectType: "recovery"`); the page and the new `updatePasswordAction` check it on the server, and a successful update clears it. Anyone else sees "This link has expired".
- Google sign-in from `/login?next=...` returns to printkit. Before, it landed on the merqo site: Supabase honours a `redirectTo` only when it matches an allowed Redirect URL exactly, and the `?next=` on the callback URL made it fall back to the shared project's Site URL. Google sign-in, the sign-up confirmation link and the password reset link now all use the bare `/auth/callback` URL. The return path rides in a ten-minute `printkit_auth_next` cookie, which the callback checks with `safeRedirectPath` and clears. A `?next=` on the callback still works.
- A history link with a malformed, stale or edited `?cursor=` shows the newest jobs (still filtered when `?unrouted=1` is on). Before, it crashed to "Something went wrong".
- A dashboard page that fails now shows its error inside the dashboard, with the navigation, "Try again" and a link back to the overview. Before, the whole page was replaced.
- A signed-out vendor who opens a dashboard link, such as the printer picker for one booth, now lands on that page after signing in. Before, sign-in always ended on the dashboard overview. This works for password sign-in, Google sign-in and the sign-up confirmation link. Only a path on printkit itself is honoured; anything else falls back to the overview. A link to one booth's row (`#booth-<id>`) is kept as well.
- On a phone or tablet, the help icon beside the helper-device buttons on Bluetooth setup no longer takes taps meant for the edge of the "Raspberry Pi" button. Its touch area overlapped that button by about 2px.
- Restore login controls after unexpected authentication failures and display offline printer timestamps in the Singapore timezone.

- Improve small brand-text and input-boundary contrast in both themes while preserving primary button fills and decorative separators.

- Device result handlers return an error when the result could not be saved.
  Agent and CloudPRNT updates recheck location and sent state atomically;
  Feie updates recheck the signed attempt reference and sent state. Failed
  Feie lookups request a retry; stale callbacks remain idempotent.
- Outbound callback lookup failures remain best-effort, canvas bitmaps close
  even when rendering fails, and setup action failures restore the retry UI.

- A NIIMBOT B1 that printed the label but never sent the "job done" packets
  was reported as a failed print (first seen on real hardware, 2026-09-22:
  paper came out, `Timeout waiting response (waited for de, df, dd, d9)`).
  The vendor would have reprinted an order that was already labelled.
  `printLabel` now treats an acknowledgement timeout after the page was sent
  as printed, and still fails on every other error. Closing the job is
  best-effort for the same reason.
- Bridge mode asked for a screen wake lock while its tab was hidden, which
  always throws (`NotAllowedError`). It now waits until the tab is visible.

### Changed

- Printer recommendation now follows what the vendor lives with rather than
  the connector: a printer that works with an iPad alone and costs nothing
  after purchase ranks first, cheapest first; a 4G printer with a data plan
  second; Bluetooth last. Catalog entries gained `monthlyCost`, the rule is
  `recommendationTier` in `src/lib/printer-catalog.ts`, and each picker card
  shows a "Monthly cost" row with an info tip.

### Added

- Feie FP-N20W, the WiFi version of the Feie label printer, on the existing
  Feie driver. It is now the first recommendation: WiFi, no SIM, no monthly
  fee, and a fraction of the Star's price.

### Changed

- The printer picker recommends by friction: standalone WiFi printers
  (`cloud_poll`) first, maker-cloud printers (`vendor_cloud`, where the 4G
  data plan is a running cost) second, Bluetooth printers last. The order is
  one rule in `src/lib/printer-catalog.ts` (`CONNECTOR_RANK`,
  `compareRecommended`), and the "Recommended" badge (`isRecommended`) goes
  to the top tier only, replacing the per-entry `recommended` flag that had
  the Feie 4G printer first. The 4G and "Recommended" explanations and the
  Feie card now say the data plan is a monthly cost.

### Fixed

- Printer connectors, checked against each maker's published protocol:
  - Feie: a printer Feie refused at setup (wrong KEY, already bound to 3
    accounts) was reported as connected, because Feie answers `ret: 0` and
    lists refusals in `data.no`. Now surfaced with a plain reason.
  - Feie: an offline printer on the Asia-Pacific station was reported
    online, because that station answers in Chinese (`离线。`).
  - Feie: print jobs never asked Feie to call back (no `backurl`), and the
    callback route verified the wrong signing string and answered JSON
    instead of the literal `SUCCESS`. Callbacks now follow Feie's documented
    format; the sweep's status query remains the fallback.
  - Feie: centred Chinese text was offset, since a Chinese character is
    twice a Latin one's width in font 12.
  - Star CloudPRNT: firmware without job-token support could fetch no job
    at all. A token-less fetch now claims the oldest waiting job and a
    token-less confirmation settles the last sent one.
  - Printer setup could hand a CloudPRNT printer a relative URL when
    `NEXT_PUBLIC_SITE_URL` was unset. `src/lib/site-url.ts` now resolves an
    absolute origin (`PRINTKIT_PUBLIC_URL`, else Vercel's host) and setup
    refuses rather than minting a credential for an unusable address.
  - Raspberry Pi agent: `src/printer.ts` called functions
    `@mmote/niimblue-node` does not export, and the dependency range
    (`^0.1.0`) could not resolve the current 1.x. Rewritten against the
    library's real API (`initClient`, `ImageEncoder`, `printImages`), pinned
    to 1.3.0, with a `tsconfig.json` so `npm run build` works. The installer
    now installs BlueZ and build tools, links the `printkit-bridge` command
    and creates the config directory; the systemd unit grants the
    `CAP_NET_RAW`/`CAP_NET_ADMIN` a raw Bluetooth socket needs.
- The printer catalog tells vendors to buy the mC-Label2 X4 model; the CI
  model has no WiFi without a dongle.
- `next build` failed: Turbopack cannot bundle `@napi-rs/canvas`'s native
  binding. It is now a `serverExternalPackages` entry, and the label fonts
  in `src/assets/fonts/` are added to every API route's file trace, since
  they are read from disk at run time.
- Raspberry Pi agent input checks (CodeQL review on the PR): the printkit
  address must be HTTPS (plain HTTP only to this machine), the agent token
  must match printkit's format (no header injection from a tampered config
  file), and a job id from printkit must be a UUID and is URL-encoded before
  it goes into a path. `createPrinter` JSON-quotes an unknown catalog id in
  its log line so a crafted id cannot forge log entries.
- A late or repeated result report (Star `DELETE`, the Pi agent's
  `result`) could overwrite a job the vendor had since requeued. Both now
  settle only a job that is still `sent`.
- The Bluetooth guide's Raspberry Pi steps pointed at a release download
  that was never published. The guide now installs Node 24 and git, then
  `git clone`s the public repo and runs `bridge-agent/install.sh`.

### Added

- Printer-connectors core (phase 1 of
  `docs/superpowers/specs/2026-09-20-printer-connectors-design.md`), which
  opens printkit up to printers that reach it over the internet by
  themselves, for vendors who cannot keep an Android bridge device next to
  the printer:
  - `printers`, `device_credentials` and `bridge_pairing_codes` tables, four
    new `print_jobs` columns (`driver_ref`, `failure_reason`, `sent_at`,
    `requeued_at`), and the `claim_job` SQL function (migration `0008`).
  - `src/lib/printer-catalog.ts`, the static list of supported printer
    models, what each needs to work, and whether Merqo has tested it on real
    hardware yet.
  - `src/lib/label-layout.ts` and `src/lib/label-raster.ts`: labels are now
    built as a device-independent layout and rasterized to a monochrome PNG
    on the server, with bundled Latin and CJK fonts, so every connector
    prints the same label.
  - `src/lib/connectors/`, the three driver interfaces and their registry.
  - `src/lib/printers.ts` (printer reads plus the shared `last_seen_at`
    health signal) and `src/lib/job-dispatch.ts` (`claimJob`,
    `sweepLocation`, `dispatchJob`).
  - `GET /api/v1/print-locations/status`, so a calling kit can show printer
    status over HTTP instead of subscribing to printkit's realtime channel.
- The `cloud_poll` connector and its first driver, Star CloudPRNT (phase 2):
  `/api/cloudprnt/[token]` serves one URL per printer, handling the
  printer's poll, its job download and its result confirmation. The URL
  token is the whole credential: it is stored only as a hash, the first
  device to present it is bound to the printer, a job is handed out only
  through `claim_job` (so a second fetch of the same job is a 404), and a
  device cannot confirm a job belonging to another printer.
- `src/lib/device-credentials.ts`, which mints, rotates and revokes the
  secret a device presents.
- The `vendor_cloud` connector and its first driver, Feie (phase 3): a 4G
  printer with no WiFi and no helper device now prints by way of the maker's
  own cloud. printkit claims the job first (so nothing is ever sent twice),
  sends the label as Feie tag markup (Feie cannot accept a full-label
  image), and records the maker's job id. Results arrive through the signed
  `POST /api/feie/callback`, or through a status query during the sweep if
  that callback is lost. New server-only env vars: `FEIE_USER`, `FEIE_UKEY`,
  `FEIE_API_BASE`, `FEIE_CALLBACK_PUBLIC_KEY`. A vendor's printer KEY is
  used once at registration and never stored.
- The vendor-facing printer UI (phase 5): a Printers page (one row per booth,
  with its printer and whether it is online), a printer picker with filters
  (works with iPad alone, connection, label width), sorting, and an "i"
  explanation on every badge that opens on tap for iPad users, a setup wizard
  per kind of printer that ends in a live "Connected", and a public Bluetooth
  guide at `/guides/bluetooth-printers` that opens by saying we do not
  recommend that path and then explains it properly anyway. The dashboard nav
  now points at Printers instead of Bridge.
- `GET /api/bridge/jobs/[id]/label` and `GET /api/bridge/sample-label`, the
  rendered label and the setup test print for bridge devices.
- A Raspberry Pi bridge agent (phase 4, part B), for a vendor who owns a
  Bluetooth printer but cannot leave a phone beside it: `bridge-agent/` (a
  small Node program with an installer and a systemd unit) plus its
  endpoints under `/api/v1/bridge-agent/`. The Pi pairs with a single-use
  code that expires in ten minutes, then authenticates with its own device
  token, which reaches exactly one printer. It prints one job at a time,
  reports failures rather than retrying silently, backs off when printkit is
  unreachable, and stops for good once unpaired. No real label has been
  printed from a Pi yet: the upstream Bluetooth library documents Windows
  and macOS, not Linux, so this waits on the hardware gate.
- A dev-only and preview-only virtual printer at
  `/dashboard/dev/virtual-printer`: a printer made of HTML that speaks the
  same exchange against the same endpoint, so the whole print path can be
  proven before buying hardware.

### Changed

- The Bluetooth bridge now works like every other connector (phase 4, part
  A). It no longer draws labels: it downloads the same server-rendered PNG,
  so a Bluetooth printer produces the same label as a cloud printer. Every
  print is preceded by a claim, so a realtime event alone can no longer make
  two bridges print one label, and pairing picks up a job that arrived while
  the bridge was off. Health moved from a realtime presence channel to the
  shared `last_seen_at` heartbeat, which is why the dashboard now shows each
  booth's printer and its state rather than a bridge-only pill. Pairing also
  creates the booth's printer row. The screen wake lock is unchanged in
  behaviour and now lives in its own hook.
- `updatePrintJobStatus` now takes an optional failure reason (`expired`,
  `printer_offline`, `driver_error`, `device_reported_error`) and, when a
  job returns to `queued`, stamps `requeued_at` and clears `sent_at` so its
  expiry window restarts. Requeueing also re-runs dispatch.
- A job that has sat `queued` for more than 30 minutes is failed as
  `expired` instead of printing whenever a printer next comes online, so a
  printer switched on the next morning does not print the previous day's
  labels.
- `reprintJob` now also accepts an already-`printed` job, not just a
  `failed` one — a vendor who lost or peeled off a good label had no way to
  print another copy.
- Bumped `@merqo/ui` to `v0.30.0`.

### Fixed

- `/legal/terms` now shows only printkit's own Annex schedule, not every
  sibling kit's, via `@merqo/ui`'s new per-kit `getLegalDocSource`/
  `LegalDocument` scoping. `legal/accept/actions.ts`'s recorded
  `doc_sha256` now hashes that same scoped content.

- `merqoBaseUrl()` (`src/lib/legal-gate.ts`, `src/app/legal/accept/actions.ts`)
  hardcoded its no-env-var fallback to `https://merqo-sg.vercel.app`, a dead
  host: direct curl testing confirmed it 404s on every route including `/`,
  while merqo's real production host, `https://www.merqo.io`, correctly
  serves `/api/merqo/legal-accept` (405), `/api/merqo/legal-status` (401),
  and `/api/merqo/customer-connect-token` (405). `MERQO_BASE_URL` was never
  set as an explicit Vercel env override on any kit, so every kit-to-merqo
  call relying on this fallback has silently been hitting a dead host in
  production. Fixed the literal fallback here; the primary fix is still
  setting `MERQO_BASE_URL` explicitly in Vercel, this is defense-in-depth.
- Bumped `@merqo/ui` to `v0.26.0` and switched `legal-gate.ts`/`legal/accept/
actions.ts` to import `LEGAL_VERSIONS`/`getLegalDocSource`/`isLegalCurrent`
  from its new `@merqo/ui/legal` subpath instead of the package root. Those
  are plain non-React functions, but the root export is bundled under a
  package-wide `"use client"` banner — calling them from server code (a
  Server Action, the server-only legal gate) threw "Attempted to call X()
  from the server but X is on the client". The gate's own fail-closed
  try/catch silently swallowed this, redirecting every vendor to
  `/legal/accept` instead of surfacing the real error.

### Security

- Bound streamed pairing, printer-poll and signed callback bodies before parsing; require revision-bound CloudPRNT results and scope administrator membership (migrations 0009–0010). SQL and physical-printer validation remain pending.
- Read kit callback secrets through bounded stdin and install the bridge from its lockfile with only named native builds as an unprivileged service user.

- Bumped `next` to `16.3.4` (`eslint-config-next` to match), which pulls
  `sharp` to `0.35.4`. Clears two critical Next.js RCE advisories
  (GHSA-p293-qw3h-jr36, GHSA-2xp9-vwfh-vxw4) and a high `sharp`/libheif
  advisory. `browserslist` was already at a patched version.
- Dropped `output: "standalone"` from `next.config.ts`. printkit deploys
  only to Vercel, which bundles functions itself and does not use the
  standalone output, and under `next` 16.3.x that config also made Vercel's
  build finalizer look for a server trace file it no longer writes there.
- Bumped `vitest` and `@vitest/coverage-v8` to `4.1.11` (from `3.2.6`).
  Clears GHSA-82fw-gwwq-j7x9 (`@vitest/mocker` path traversal / arbitrary
  file read, patched only in `4.1.11`). Also `fast-uri` to `4.1.4` and the
  `qs` override to `>=6.16.0`, clearing four high and two moderate advisories
  reaching in through `@stryker-mutator`. The dependency audit is now clean
  at every level. `src/lib/niimbot-print.test.ts`'s `NiimbotBluetoothClient`
  mock switched from an arrow `mockImplementation` to a `function`
  expression: `vitest` 4 no longer lets an arrow `vi.fn()` be `new`-ed.

### Changed

- `@merqo/ui` bumped to `v0.25.0`: a "← Back" button on `/legal/terms`
  and `/legal/privacy`, and a pre-lawyer-review legal-wording pass (no em
  dashes, PDPA-accurate rights language, added missing no-warranty/IP
  clauses to the standard Terms). No `/about` page here (printkit has no
  public landing surface — a vendor only reaches it from qkit's booth
  settings).
- Dropped the required typed legal-name field from terms/privacy
  acceptance — a plain ToS/Privacy clickwrap doesn't need a signatory
  name for evidentiary strength beyond the existing (vendor_email,
  auth_uid, doc_type, doc_version, ip, user_agent, timestamp) record kept
  by merqo. `@merqo/ui` bumped to `v0.24.0` (`TermsAcceptanceCheckbox` no
  longer takes `legalName`/`onLegalNameChange`).

### Added

- Legal-acceptance gate: `/legal/terms` + `/legal/privacy` pages (rendered
  from `@merqo/ui`'s shared content) and the `/legal/accept` interstitial,
  wired into `getVendorSession()` — a signed-in vendor whose terms/privacy
  acceptance falls behind `@merqo/ui`'s `LEGAL_VERSIONS` is bounced there
  before reaching any dashboard page. printkit owns no acceptance record
  itself (merqo does); currency is checked via a bearer-authed `GET
/api/merqo/legal-status` call (`src/lib/legal-gate.ts`), cached in the new
  `printkit.legal_check_state` table for 5 minutes, and failing closed on any
  error. Acceptance is recorded via `POST /api/merqo/legal-accept`
  (`src/app/legal/accept/actions.ts`), terms and privacy posted as two
  independent calls. New `MERQO_BASE_URL`/`MERQO_CUSTOMER_SECRET` env vars
  (printkit's first kit→merqo outbound call). The dashboard shell's footer
  now links to Terms/Privacy (`@merqo/ui`'s `LegalFooterLinks`) — printkit
  has no public landing page for a marketing footer to live on instead.

### Changed

- `@merqo/ui` bumped to v0.23.0 (from v0.22.1, which added `JobStatusBadge`
  rendering through the shared `StatusBadge` component instead of shadcn's
  `Badge`, with each status mapped onto an existing brand token
  (`secondary`/`flow`/`mint`/`destructive`) instead of the previous
  raw-literal/token mix).

- `@merqo/ui` bumped to v0.23.1 — `acceptLegalTerms` now forwards the
  vendor's submitted `legal_name` and their real `ip`/`user_agent` (read
  via `headers()`) in both `legal-accept` POST bodies, matching merqo's
  now-required `legal_name` field.

### Added

- Per-NIIMBOT-model print config (`src/lib/niimbot-model.ts`), replacing the hardcoded `"B1"`/`"top"` literals in `niimbot-print.ts` — `niimbluelib` already supports other NIIMBOT models (B18, D110), so this was purely an app-side hardcode. `printLabel` gains an optional `model` param, defaulting to today's only supported model. No behavior change.

- Job-type-keyed render dispatch in the bridge (`src/lib/print-job-renderers.ts`), replacing `bridge-panel.tsx`'s two hardcoded `renderLabelCanvas` calls — one entry today (`'label'`), a real seam for a second job type. A job whose type has no renderer is now reported `failed` with a clear log line instead of silently doing nothing.

- `POST /api/v1/print-jobs` accepts an optional `job_type` field, threaded through to `createPrintJob` — the DB still only allows `'label'` today, this just decouples the API shape from that constraint ahead of a second job type.
- `kit_api_keys` gains optional `callback_url`/`callback_secret` columns (plaintext, service-role only) so a calling kit's print-status callback is configured per-row instead of hardcoded to qkit's own env vars. New `src/lib/kit-callback.ts` (`notifyKitPrintStatus`) replaces the qkit-only `qkit-client.ts`; `updatePrintJobStatus` now notifies whichever kit created the job, not just qkit. `scripts/create-kit-key.mjs` gains optional trailing `callback_url`/`callback_secret` args to populate them.

- Per-location print routing: a new `print_locations` table lets a vendor pair a separate physical bridge/printer to each of their booths instead of one shared bridge per vendor, closing the multi-simultaneous-location gap in the v0.1 design. New `POST /api/v1/print-locations` registration endpoint; `POST /api/v1/print-jobs` gains an optional `location_ref` field. Presence and job-delivery Realtime channels are now location-scoped. Bridge pairing gains a location picker; the Overview page shows per-location bridge status plus an "unrouted jobs" callout; History gets a location column and a manual location-assign action for unrouted jobs.

### Changed

- Root page (`/`) now redirects to `/dashboard` instead of showing a placeholder — printkit has no cold-acquisition funnel, so it needs no marketing landing page.
- Bumped `@merqo/ui` to v0.19.0: the account menu's theme control now sits behind a collapsed "Theme · {current}" submenu instead of three always-expanded radio options.
- Trimmed a couple of over-long code comments down to one line each; no behavior change.
- The bridge page (`/dashboard/bridge`) now accepts a `?booth=<id>` search param (matched against a location's `source_ref`) that skips straight to that booth's pairing panel — deep-linked from qkit's booth settings "Choose the printer for this booth" link, instead of making the vendor find it in a list.
- "Banknote Engrave" theme's secondary color is now a warm grey instead of steel-blue — it read too close to the primary's own teal-green hue at a glance.

## [0.1.0] - 2026-08-21

### Added

- Initial printkit scaffold: seeded from paykit, pruned to a bare Next.js + Supabase harness.
- Auth scaffolding (login, session guard).
- Data model: `print_jobs`, `kit_api_keys`, `admins`/`is_admin`/`admin_audit` with RLS, verified against real Postgres via pgTAP.
- Bearer-secret kit-auth verification helper (`kit-auth.ts`), `create-kit-key.mjs` for minting calling-kit secrets.
