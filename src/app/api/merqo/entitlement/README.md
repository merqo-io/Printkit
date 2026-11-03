# entitlement

## Purpose

Receives merqo's per-vendor entitlement push and caches it for the label gate.

## Contents

- `route.ts` - `POST /api/merqo/entitlement`. Checks the bearer against
  `MERQO_PROVISION_SECRET`, parses the body with `entitlementPayloadSchema`,
  requires `kit` to be `printkit`, then calls the `apply_vendor_entitlement`
  RPC. Returns 401 for a bad bearer, 400 for a bad body or another kit, 404
  `unknown_vendor` when the email has no account, 500 `store_failed` on a
  database error, and 200 `{ok:true}` otherwise. A push whose `issued_at` is
  not newer than the stored one is a 200 no-op, decided atomically in SQL.
- `route.test.ts` - bearer, bad body, wrong kit, unknown vendor, stale and
  event-pass cases.

## Connectivity

Writes `printkit.vendor_entitlements` (migration 0017). `vendorHasLabelAccess`
(`@/lib/vendor-entitlement`) reads it to gate label print jobs.

## Parent

See [../README.md](../README.md).
