# docs

- `DEPLOY.md` - also covers the Merqo entitlement rollout order (migration 0017, `MERQO_PROVISION_SECRET`, resync). Supabase/Vercel deployment runbook (on the shared Merqo
  project), with a Staging section for printkit's `Preview` values on the
  shared staging project and the staging-first migration gate, including the
  per-calling-kit callback config migration note (env vars → `kit_api_keys`
  columns) and a note that `NEXT_PUBLIC_QKIT_URL` is optional and only
  drives the Overview's first-run qkit link. Only `main` and `staging` deploy from git (staging via Vercel's git integration on push to `staging`); ad-hoc previews come from the `vercel` CLI. Repo links point at the `merqo-io` GitHub organization.
- `FILE-LAYOUT.md` — source tree map, moved out of `AGENTS.md`.
- `DATA-MODEL.md` — tables, RLS and audit trail, moved out of `AGENTS.md`.
- `meta/` — standing backlog / cross-cutting project-management docs.
- `superpowers/` — per-feature specs (`specs/`), implementation plans
  (`plans/`) and manual/hardware test plans (`testing/`). Granular per-task history for the MVP build itself lives at
  `.superpowers/sdd/` (repo root, outside `docs/`).

`audits/` records the reviewed application checkpoint and outstanding database, bridge dependency and physical hardware validation.
