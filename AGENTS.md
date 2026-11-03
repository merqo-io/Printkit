<!-- templateCentral: nextjs@6.0.4 (Supabase variant — shared project, schema per kit) -->

# AGENTS.md — printkit

> STOP — This project diverges from the stock templateCentral Next.js stack on
> the data layer only. Auth/DB/realtime are **Supabase** (`@supabase/ssr`), not
> better-auth + Drizzle. Authorization is enforced in Postgres via **RLS**, not
> an app repository layer. Runtime matches tc: Next 16, route protection in
> `src/proxy.ts`, and `cookies()`/`headers()`/`params`/`searchParams` are async.

## What printkit is

Hardware print connector for Merqo vendors — job-type-agnostic architecture,
v0.1 ships one job type (label, via the NIIMBOT B1). Owns the `printkit`
schema in the shared Supabase project. qkit calls printkit's bearer-secret
`POST /api/v1/print-jobs` on order-placed; printkit calls back on job status
change via a kit-agnostic lookup (`kit_api_keys.callback_url`/
`callback_secret`, `src/lib/kit-callback.ts`) — qkit is the only calling kit
configured today, not the only one supported. Full design:
`docs/superpowers/specs/2026-08-21-printkit-v0.1-design.md`.

**Printer connectors (2026-09-20):** printing is no longer Android-bridge
only. Three connectors (`src/lib/connectors/`), each with brand drivers
behind a fixed interface and a static catalog (`src/lib/printer-catalog.ts`):
`cloud_poll` (Star CloudPRNT, `/api/cloudprnt/[token]`), `vendor_cloud`
(Feie 4G, `/api/feie/callback`) and `bridge` (Android Bridge mode or the
Raspberry Pi agent in `bridge-agent/`, least recommended). `claim_job` (SQL)
is the only path from `queued` to `sent`; health is `printers.last_seen_at`,
not Realtime presence. Design:
`docs/superpowers/specs/2026-09-20-printer-connectors-design.md`.

## Stack

Next.js 16 · App Router · Turbopack · TypeScript strict · Tailwind v4 · shadcn/ui
(new-york) · Zod · Supabase (`@supabase/ssr`) · Vitest · pnpm 11 · Node ≥24 ·
deploy target: Vercel

## Commands

```bash
pnpm dev          # dev server — http://localhost:3000
pnpm build        # production build
pnpm test         # run test suite (vitest)
pnpm test:mutation # stryker mutation testing (scoped to src/lib; advisory)
pnpm check        # prettier --check + eslint + tsc --noEmit
pnpm format       # prettier --write
```

## File Layout

See `docs/FILE-LAYOUT.md` (app router, `src/proxy.ts`, `src/lib/supabase/`,
`kit-auth.ts`, `vendor-session.ts`, `types.ts`, migrations, pgTAP suite).

## Data model

Full detail in `docs/DATA-MODEL.md`. In short: `print_jobs` (vendor reads own
rows only; writes are service-role + bearer-secret, server-only),
`print_locations`, `printers`, `device_credentials`, `bridge_pairing_codes`,
`kit_api_keys` (service-role only), and `admins`/`admin_audit` (immutable
platform-operator audit trail, service-role insert/select only).

## Rules (always)

- TypeScript strict — no `any`, no `@ts-ignore`.
- Validate all user input with Zod at every boundary.
- Authorization lives in **RLS policies**, not in app code.
- Use the **service-role client only** in Server Actions / Route Handlers, never
  in client components.
- No secrets in `NEXT_PUBLIC_*`.
- `@supabase/ssr` and `@supabase/supabase-js` versions must stay compatible.
- Kit API routes verify the calling kit with `verifyKitAuth` before database
  access. Bridge-agent routes verify device credentials with `resolveAgent`;
  public pairing redeems a bounded, expiring, single-use pairing code.
- No shared code library for print/Bluetooth logic — printkit-only, never
  imported by another kit.
- After editing the schema, update both `supabase/migrations/` and
  `src/lib/types.ts`.
- Never instruct an agent to run `.claude/regen-harness.sh` — it's
  human-run only (its own header says so), since running it can launder a
  tampered or drifted hook/workflow into a passing integrity check. A
  harness-guarded file that needs a cosmetic fix gets left for a human to
  fix directly, who then runs `regen-harness.sh` themselves.

## Skills

### Project skills — check here first (`.claude/skills/`)

| Skill               | What it does                                                 |
| ------------------- | ------------------------------------------------------------ |
| `/next-verify`      | typecheck + lint + test in one pass                          |
| `/supabase-migrate` | apply `supabase/migrations` + regenerate types (safety gate) |

### templateCentral plugin skills

templateCentral has **no Supabase support** (auth=better-auth, db=Drizzle/Kysely/Mongoose,
no realtime). Use only the stack-agnostic ones here:

| Skill                       | When to use                                                          |
| --------------------------- | -------------------------------------------------------------------- |
| `templatecentral:standards` | naming/validation/drift-check (expect Supabase-vs-tc drift findings) |

Do **not** run `templatecentral:add (auth)` or `(database)` — they install
better-auth / Drizzle and will break RLS.

The templateCentral 6.0.4 review (adopted / not-adopted history, 2026-10-12)
is in `docs/meta/templatecentral-adoption-log.md`.

## AI Harness

Full hook-by-hook, husky and CI detail: `docs/meta/ai-harness-reference.md`.
Enforcement points an agent must obey:

- PreToolUse(Read|Edit|Write): secret-file reads and writes are hard-blocked
  (environment files except the blank templates, secret directories,
  certificate/credential files). Governance and CI/CD writes require human
  approval; their reads are allowed. The Bash guard blocks hook bypasses,
  protected-branch force pushes and destructive guard edits.
- UserPromptSubmit: credential-shaped input is blocked; injection-phrase
  matches add advisory context.
- PostToolUse: `tsc --noEmit --incremental` and a comment-hygiene scan after
  every Edit/Write (feedback-only, never block).
- Stop: runs the test suite; exit 2 feeds failures back.
- SessionStart: re-injects the first 30 lines of this file.
- `permissions`: `deny` covers secret reads/edits (`.env.local` and other
  `.env.<env>` variants, `./secrets/**`; `.env.example` is the one whitelisted
  env file) and irreversible ops (`rm -rf`, `git push --force`/`-f`,
  `git reset --hard`, `git clean -fd/-fx`, `git filter-branch`, ref-delete).
  `ask` gates `Edit(...)` (covers Edit and Write) on `AGENTS.md`, `CLAUDE.md`,
  `docs/CONSTITUTION.md`, `.claude/harness.json`, `.claude/settings.json`,
  `.claude/settings.local.json`. Deny always wins (enforced even under
  bypass); it's a guardrail, not a sandbox.
- Git hooks (husky): pre-commit runs format/lint/typecheck, a frozen-lockfile
  install gated on `package.json` changes, gitleaks on staged files, and
  warn-only readme-coupling and comment-hygiene checks; commit-msg enforces
  Conventional Commits; pre-push runs the harness integrity check + quality
  gate.
- CI hard gates: changed-line coverage (`diff-cover` ≥80%), `build`,
  changelog-touched, readme-freshness, comment hygiene, harness integrity,
  lockfile-in-sync, and `security.yml` (gitleaks, `pnpm audit`, CodeQL).
- RLS isolation: `supabase/tests/rls.test.sql` via `supabase test db`.
  Manifest: `.claude/harness.json`; project skills live in `.claude/skills/`.

## Skills Security

- Review `SKILL.md` before installing any third-party skill — treat skills like packages.
- Scope `allowed-tools:` to the minimum (e.g. `Bash(git *)` not `Bash`).
- Never install skills that hardcode secrets or make unlisted outbound calls.

## Project-Specific Notes

Seeding origin and design/plan-of-record links are at the end of
`docs/meta/ai-harness-reference.md`.

<!-- [[post-harness]] — reserved for trace capture and meta-harness integration -->

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
