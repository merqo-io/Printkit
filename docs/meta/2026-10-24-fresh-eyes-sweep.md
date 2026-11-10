# Fresh-eyes sweep (close-out, roadmap X-14, X-15, X-16, X-20)

## knip

- Command: `pnpm dlx knip@6.44.2 --no-progress` (knip is not a dependency). Config: `knip.json` (operator scripts and their tests as entries; `bridge-agent/` and `.claude/` ignored).
- Before (no config): 27 findings: 5 unused files, 2 unused devDependencies, 15 unused exports, 5 unused exported types.
- After: 0 findings, exit 0.
- Removed: devDependencies `@eslint/eslintrc` and `@tailwindcss/typography` (lockfile updated; no config or CSS references them). Unused exports lost their `export` keyword (values are still used inside their module): `isFirstRunComplete`, `FAILURE_FALLBACK`, `AUTH_NEXT_MAX_AGE`, `MAX_BATCH_LABELS`, `STUCK_AFTER_MS`, `HEALTH_ONLINE_MS`, `SEEN_WRITE_THROTTLE_MS`, `KIT_LIMIT`, `MAX_LOGOS`, types `OutputFormat` and `OpsEventKind`. The `job-dispatch.ts` re-export of `JOB_EXPIRY_MS` and `CONFIRM_TIMEOUT_MS` is gone (`job-expiry.ts` owns them). `FeedbackInput` was unused and is deleted.
- Not code findings, handled by config: the 5 "unused files" were `scripts/*.mjs` (operator tools run by hand, `create-kit-key` also by `test/operators`), two copies of `user-prompt-guard.cjs` under `.claude/` (harness hooks) and `bridge-agent/src/cli.ts` (the agent's own entry point). The 4 exports in `bridge-agent/` (`printkitOrigin`, `configDir`, `configPath`, `POLL_INTERVAL_MS`) are out of scope: that package has its own build.
- Justified leftovers (kept via `ignoreIssues` for types): `EntitlementPayload` in `src/lib/merqo-entitlement-contract.ts` and `BridgeDriver` in `src/lib/connectors/types.ts`. Both are named in `src/lib/README.md` and `src/lib/connectors/README.md` as part of the documented contract.

## Duplicates

- Inside this repo: `clientIp` in `src/app/legal/accept/actions.ts` repeats the idea of `clientIp` in `src/lib/rate-limit.ts` but trusts `x-forwarded-for` first and returns `"unknown"`. It only feeds the acceptance audit field. Not merged: the header order would change (see Deferred).
- Likely duplicated across kits (candidates for `@merqo/ui` only, not extracted): `clientIp` and the trusted-header list, the rate-limit store over a `check_rate_limit` RPC, `sha256` hex helper, kit bearer-secret verification. Several already come from `@merqo/ui`; the wrappers here add only the header list and the Supabase store.

## Server vs client components

- Files marked `"use client"` with no hook or event handler of their own: `src/components/info-button.tsx` (wraps the shared `InfoTooltip`, which is itself a client component) and `src/app/dev/ui-states/error/error.tsx` (an error boundary must be a client component). Only `info-button.tsx` is a candidate; left alone because it is also imported from client trees.

## Sequential awaits

- Pages already use `Promise.all` for independent reads. One waterfall remains: `src/app/dashboard/printers/designer/page.tsx` awaits the design query, then `signLogoUrls`, then `getPrinterByLocation`; the printer lookup does not depend on the other two. Deferred.
- `src/app/dashboard/layout.tsx` awaits `getVendorSession` then `getOrCreateVendorProfile`; the second needs the first.

## loading.tsx

- `src/app/dashboard/loading.tsx` covers every `/dashboard/*` page segment.
- Added `src/app/reset-password/loading.tsx` (page awaits the server client and `getRecoveryState`), with a render test.
- `src/app/legal/accept/page.tsx`: not needed. It awaits only `searchParams`; there is no data fetch.
- `src/app/dev/ui-states/error/page.tsx`: skipped on purpose; dev-only preview that is meant to throw.
- Not covered by a segment `loading.tsx`: `src/app/dashboard/layout.tsx:13-14` awaits the session and vendor profile. A segment loading file renders inside the layout, so it cannot show during that wait. Needs a product decision (a layout skeleton or streaming the header).
- Other async pages (`login`, `about`, `guides/*`, `legal/privacy`, `legal/terms`) await no data or are client components.

## Bundle size

- Not measured. The Next 16.4.2 (Turbopack) route table printed by `pnpm build` has no First Load JS column, and `.next` is not readable from this session. No route could be checked against 250 kB.

## Coverage

- `vitest run --coverage` (provider `@vitest/coverage-v8`, already installed): all files 94.02% lines, 92.26% statements; thresholds pass.
- Business-logic files under 70% lines before this PR: `src/lib/render-job.ts` (57.14%, now covered by `src/lib/render-job.test.ts`). Left below 70%: `src/lib/supabase/server.ts` (50%, thin adapter), `src/app/actions/auth.ts` (25%, sign-out action), `src/app/dashboard/dashboard-nav.tsx` (64%, UI), `bridge-agent/src/cli.ts` (0%, process entry point).
- Tests: 1373 on `staging` before, 1380 after (1 loading test, 6 `render-job` tests).

## templatecentral:standards

- Not run: the skill is not available to this builder. Supabase-vs-templateCentral drift is expected and reviewed in `templatecentral-adoption-log.md`.

## Fixed in this PR

- knip clean (see above); two unused devDependencies removed.
- `reset-password/loading.tsx` plus test.
- `render-job.ts` branches covered by tests.
- CHANGELOG: empty `[Unreleased]`, dated `[0.9.0] - 2026-11-10`; `package.json` version 0.9.0. The stray `Unreleased` blocks were placed by git history: "plainer history and printer picker" and the second `[Unreleased]` entries from 2026-11-01 and 2026-11-02 into 0.8.0 (stamped 2026-11-02 20:03), the Vercel git-deploy entry (2026-11-03) into 0.9.0, "sticker designer foundation" and "sticker logo upload" into 0.7.0. Merged duplicates, nothing else dropped: the virtual printer move and the shared dashboard header (both already in the 0.9.0 block word for word) and the B1 calibration line (already in 0.5.0).
- Every `src/` folder already has a README; none were missing.

## Deferred

- Move `getPrinterByLocation` in the designer page into a `Promise.all` with the design query.
- Reuse `clientIp` from `src/lib/rate-limit.ts` in `legal/accept/actions.ts` (changes which header wins).
- Drop `"use client"` from `info-button.tsx` after checking its importers.
- Tests for `app/actions/auth.ts` and `dashboard-nav.tsx` branches.
- Add explicit return types to exported functions (not audited in this sweep).

## Needs owner

- Layout-level loading state for `/dashboard` (session and profile awaits in the layout).
- Whether to add knip to CI or `devDependencies`; today it runs only on demand.
- Bundle-size check: needs a build analyzer or a Next version that prints sizes.
- `bridge-agent/` dead-export findings (4 exports) and whether it should get its own knip run.
