# Operator scripts

create-kit-key.mjs creates or rotates an inbound kit token and stores only its SHA256 hash. The new inbound token is intentionally printed once for transfer to the calling kit's secret store. Do not capture this command's output in shared logs.

To rotate only the inbound token, run node scripts/create-kit-key.mjs qkit. Existing callback fields stay unchanged.

To configure a callback, pipe the callback secret from your secret manager into node scripts/create-kit-key.mjs qkit --callback-url https://qkit.merqo.io/api/printkit/print-status --callback-secret-stdin. Callback secrets must never be supplied as command arguments: shell history and process listings can expose them. The callback URL requires HTTPS without embedded credentials. The bounded stdin reader rejects terminal input to avoid echoing secrets.

The operator supplies Supabase credentials through the shell environment; these scripts do not load dotenv files. create-kit-key-input.mjs contains argument and input validation. Regression tests run with node --test test/operators/*.test.mjs using synthetic values only.
staging-migrate.sh applies `supabase/migrations` to the shared staging Supabase project with psql, one transaction per file. Run it inside `postgres:17.6-alpine` with the repo mounted at `/repo` (merqo's `docs/STAGING.md`). With no arguments it bootstraps every file and refuses if the `printkit` schema already exists; with file arguments it applies only those, for the staging-first migration gate.

[Parent](../README.md)

`test-label-batches.mjs` runs the batch migration regression suite against a disposable local PostgreSQL cluster, including concurrent submissions and completions.

`cleanup-sticker-logos.mjs` deletes orphaned sticker logos from the private `sticker-logos` bucket: objects no saved design version and no print job snapshot references, older than the grace period (default 24 hours, `--grace-hours N`). It is a dry run that prints the orphan paths and counts unless `--apply` is given. Run `node scripts/cleanup-sticker-logos.mjs`, review the list, then `node scripts/cleanup-sticker-logos.mjs --apply`. It needs `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` in the shell and aborts without deleting if any stored design cannot be read.

`create-kit-key.mjs` rejects the reserved kit slug `printkit-test`, which dashboard test labels use as their `source_kit` and which never triggers a callback.
