# printkit — Deploy Notes

printkit runs on the shared Merqo Supabase project in its own `printkit`
schema (it calls `merqo.*` RPCs there), Vercel-deployed from
`github.com/merqo-io/Printkit`.

## First deploy

1. Create a Supabase project for printkit. Link it and apply migrations in
   order (`supabase link --project-ref <ref>` then `supabase db push`) —
   all committed migrations, currently `0001_printkit_core.sql` through `0009_cloud_poll_claim_revision.sql`.
   Validate them against a disposable local database before applying them to the hosted project.
2. Set Vercel env vars (see `.env.example` / `src/lib/env.ts` for the
   authoritative list):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
     `SUPABASE_SECRET_KEY` — this project's own values.
   - `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN` — set to `.merqo.io` in Production
     only, plus Preview for Git branch `staging` (see Staging). Leave it
     unset on other previews: they don't run on merqo.io, so setting it
     there breaks login instead of just failing to share it.
3. Mint qkit's inbound bearer secret AND its outbound callback config in one
   call: pipe the callback secret from your secret manager into
   `node scripts/create-kit-key.mjs qkit --callback-url https://qkit.merqo.io/api/printkit/print-status --callback-secret-stdin`
   (needs `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SECRET_KEY` in the shell env).
   The printed inbound secret goes into qkit's `PRINTKIT_KIT_SECRET` (raw,
   no `kit_slug:` prefix — qkit's own client code adds that); the
   callback secret supplied through standard input must equal qkit's own
   `PRINTKIT_CALLBACK_SECRET`. Both the inbound secret and the outbound
   callback config now live in `kit_api_keys` — there is no printkit-side
   env var for either anymore.
4. On qkit's side, set `NEXT_PUBLIC_PRINTKIT_URL` to this deployment's URL.

## Staging

Vercel `Preview` deployments use the shared staging Supabase project
(`merqo-staging`), not production. The `staging` branch, kept on `main` by
the `staging sync` workflow, is served at `printkit-staging.merqo.io`. Full
setup, the env model and the rollout checklist live in merqo's
`docs/STAGING.md`. printkit's `Preview` values:

- `NEXT_PUBLIC_SUPABASE_URL` (team shared), `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  `SUPABASE_SECRET_KEY`: the staging project.
- `MERQO_BASE_URL` (`https://staging.merqo.io`) and `MERQO_CUSTOMER_SECRET`:
  the team shared Preview copies, which hold staging values.
- `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN`: `.merqo.io` for Git branch `staging` only,
  so one sign-in covers the staging hosts. Never on other previews, where the
  browser rejects the cookie and sign-in breaks.
- `PRINTKIT_PUBLIC_URL`: `https://printkit-staging.merqo.io` for Git branch
  `staging` only. Per-PR previews fall back to their own deployment URL.
- qkit's staging caller row in `printkit.kit_api_keys` comes from
  `supabase/seed/staging-kit-keys.sql` (run in the staging SQL Editor), not
  from `scripts/create-kit-key.mjs`. Its two secrets must equal qkit's
  Preview `PRINTKIT_KIT_SECRET` and `PRINTKIT_CALLBACK_SECRET`.

Vercel Deployment Protection must be off on this project (it still challenges
a branch-assigned domain), and the sync workflow needs the repo secret
`VERCEL_STAGING_DEPLOY_HOOK`: Vercel does not git-deploy a commit it already
built for production, so the workflow calls the deploy hook instead.

Load the `printkit` schema on staging with `scripts/staging-migrate.sh`, after
merqo's and qkit's, not with `supabase db push`: every kit shares one
migration history table and reuses the same version numbers.

### Migration-bearing PRs: staging first

Before merging a PR that adds a file under `supabase/migrations/`:

1. Apply only the new file(s) to staging, from the PR branch checkout, with
   `STAGING_DB_URL` set to the staging session pooler URI (merqo's
   `docs/STAGING.md`, setup step 2):
   `docker run --rm -e STAGING_DB_URL -v "${PWD}:/repo:ro" postgres:17.6-alpine sh /repo/scripts/staging-migrate.sh supabase/migrations/<new-file>.sql`
2. Check the PR's own Vercel preview end to end. It already uses the staging
   database and the other apps' staging hosts.
3. Merge the PR.
4. Apply the same file to production the usual way (Supabase SQL Editor).

## Notes

- The qkit↔printkit cross-kit integration (order-placed job creation,
  print-status callback, manual reprint) is fully built — Plans 1-4 are
  complete. The only remaining v0.1 step is the manual hands-on hardware
  test with a real NIIMBOT B1.
- Two independent secret pairs, do not mix up: `PRINTKIT_KIT_SECRET`
  (qkit→printkit, "create a job") is unrelated to the `kit_api_keys.
callback_secret` row this deployment presents back to qkit's own
  `PRINTKIT_CALLBACK_SECRET` ("job printed/failed").
- **Migration note for an already-deployed printkit**: the outbound
  callback used to read `QKIT_CALLBACK_SECRET`/`NEXT_PUBLIC_QKIT_URL` from
  env vars; both are now ignored (`src/lib/kit-callback.ts` reads
  `kit_api_keys.callback_url`/`callback_secret` instead). Run step 3's
  command against the live project before or immediately after this ships,
  or job-status callbacks to qkit silently stop until you do (fails open,
  logged, never breaks order/print flow itself).
