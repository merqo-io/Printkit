# merqo

## Purpose

Merqo-facing route handlers: bearer-authenticated endpoints the merqo hub
calls into printkit.

## Contents

- `vendor-activity/` — `GET`, one vendor's printer and job activity and
  recent incidents by email, for merqo's `/admin/vendors/[email]` page.

## Connectivity

Every route checks `bearerOk(request)` (`@/lib/merqo-auth`) against
`MERQO_METRICS_SECRET` before any database access. merqo reads the matching
secret from its `products.metrics_secret` row for slug `printkit`.

## Parent

See the repo root [README.md](../../../../README.md) for the full layout.
