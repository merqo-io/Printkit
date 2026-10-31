# docs

- `DEPLOY.md` — Supabase/Vercel deployment runbook (on the shared Merqo
  project), with a Staging section for printkit's `Preview` values on the
  shared staging project and the staging-first migration gate, including the
  per-calling-kit callback config migration note (env vars → `kit_api_keys`
  columns) and a note that `NEXT_PUBLIC_QKIT_URL` is optional and only
  drives the Overview's first-run qkit link. Repo links point at the `merqo-io` GitHub organization.
- `meta/` — standing backlog / cross-cutting project-management docs.
- `superpowers/` — per-feature specs (`specs/`), implementation plans
  (`plans/`) and manual/hardware test plans (`testing/`). Granular per-task history for the MVP build itself lives at
  `.superpowers/sdd/` (repo root, outside `docs/`).

`audits/` records the reviewed application checkpoint and outstanding database, bridge dependency and physical hardware validation.
