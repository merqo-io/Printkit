// Explicit column lists for every table read, so a new column is never returned by default.

export const PRINTER_COLUMNS =
  "id, vendor_id, location_id, catalog_id, connector, driver, device_ref, display_name, label_width_mm, label_height_mm, last_seen_at, created_at" as const;

export const PRINT_JOB_COLUMNS =
  "id, vendor_id, location_id, source_kit, source_ref, job_type, payload, status, driver_ref, failure_reason, created_at, sent_at, printed_at, requeued_at" as const;
