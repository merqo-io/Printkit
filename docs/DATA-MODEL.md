# Data model

Moved out of `AGENTS.md` to keep the always-loaded context small.

- `print_jobs`: core table, also the vendor-facing job/transaction history.
  `job_type` (`'label'` only in v0.1, column designed to hold future types),
  `status` (`queued`→`sent`→`printed`|`failed`), `source_kit`/`source_ref`
  identify the calling kit's order. RLS: vendor reads (not writes) only their
  own rows; writes are service-role + bearer-secret, server-only.
- `print_locations`: one row per `(source_kit, source_ref)` — a calling
  kit's own opaque location id (e.g. qkit's `booths.id`), never
  interpreted by printkit itself. Lets a vendor pair a separate physical
  bridge to each location instead of one shared bridge per vendor.
  `print_jobs.location_id` (nullable) references it; RLS: vendor
  read-only own rows, writes service-role + bearer-secret.
- `printers` (one per location, connector + driver + catalog id +
  `last_seen_at`), `device_credentials` (SHA-256 hashes only: CloudPRNT URL
  tokens, Pi agent tokens) and `bridge_pairing_codes` (8 chars, 10 minutes,
  single use). Vendor reads own `printers`; the other two are service-role
  only.
- `kit_api_keys`: one hashed bearer secret per calling kit, service-role only.
- `admins`/`is_admin(uid)`/`admin_audit`: internal platform-operator
  allow-list + immutable audit trail (service-role insert/select only, no
  update/delete grant ever issued, RLS admin-read-only). Logs bridge
  connected/disconnected, printer paired, printer removed, test print sent,
  manual reprint triggered, qkit link connected/disconnected, print-job
  config changed.
