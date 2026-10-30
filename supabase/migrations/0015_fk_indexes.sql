-- Index every foreign key column (Supabase advisor: unindexed foreign keys).
create index if not exists admin_audit_admin_id_idx on printkit.admin_audit (admin_id);
create index if not exists bridge_pairing_codes_printer_id_idx on printkit.bridge_pairing_codes (printer_id);
create index if not exists printers_location_id_vendor_id_idx on printkit.printers (location_id, vendor_id);
create index if not exists print_batches_vendor_id_idx on printkit.print_batches (vendor_id);
