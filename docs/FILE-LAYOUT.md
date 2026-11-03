# File layout

Moved out of `AGENTS.md` to keep the always-loaded context small.

```
src/app/                          — app router (dashboard, login, API routes)
src/proxy.ts                      — Supabase session refresh + /dashboard guard (Next 16)
src/lib/supabase/                 — browser / server / service clients (schema=printkit)
src/lib/kit-auth.ts               — bearer-secret verification for calling kits
src/lib/vendor-session.ts         — shared dashboard auth guard (getVendorSession)
src/lib/types.ts                  — DB types, generated via `supabase gen types`
scripts/create-kit-key.mjs        — mint + store a hashed bearer secret for a calling kit
supabase/migrations/              — SQL schema + RLS + grants
supabase/tests/rls.test.sql       — pgTAP RLS suite
```
