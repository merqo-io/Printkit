# vendor-activity

## Purpose

`GET /api/merqo/vendor-activity?email=...`: merqo hub's per-vendor detail
lookup for its `/admin/vendors/[email]` printkit card. The response satisfies
`vendorActivityPayloadSchema` from `@merqo/ui/contracts`.

## Contents

- `route.ts` — 401 without the `MERQO_METRICS_SECRET` bearer, 400 without a
  valid email, 404 when no auth user has that email, 503 when the user listing
  or a stats read fails. For a known user it counts `printers` and the last 30
  days of `print_jobs` (all and `failed`), reads the latest job time, and
  calls `summarizeIncidents` for the last 72 hours. The payload comes from
  `computeVendorActivity` (`src/lib/merqo-vendor-activity.ts`). A failed
  incident read only drops the optional `incidents`/`recent` fields.
- `route.test.ts` — auth, validation, 404, 503, contract parsing of a full
  payload, an inactive vendor, and the incident-read fallback.

## Parent

[merqo](../README.md)
