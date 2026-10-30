begin;
select no_plan();

select has_index('printkit', 'admin_audit', 'admin_audit_admin_id_idx', 'printkit.admin_audit (admin_id) is indexed');
select has_index('printkit', 'bridge_pairing_codes', 'bridge_pairing_codes_printer_id_idx', 'printkit.bridge_pairing_codes (printer_id) is indexed');
select has_index('printkit', 'print_batches', 'print_batches_vendor_id_idx', 'printkit.print_batches (vendor_id) is indexed');
select has_index('printkit', 'printers', 'printers_location_id_vendor_id_idx', 'printkit.printers (location_id,vendor_id) is indexed');

select is(
  (select count(*)::int from pg_tables where schemaname = 'printkit' and not rowsecurity),
  0, 'every printkit table has row level security on');

select * from finish();
rollback;
