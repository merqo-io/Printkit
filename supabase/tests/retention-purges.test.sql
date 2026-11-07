begin;
select plan(18);

insert into auth.users (id, email) values
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'retention@test.dev');
insert into printkit.print_locations (id, vendor_id, source_kit, source_ref, label)
values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'qkit', 'retention-loc', 'Booth');
insert into printkit.printers (id, vendor_id, location_id, catalog_id, connector, driver, display_name, label_width_mm, label_height_mm)
values ('ffffffff-ffff-4fff-8fff-ffffffffffff', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'x', 'bridge', 'x', 'Printer', 50, 30);

insert into printkit.bridge_pairing_codes (code_hash, printer_id, expires_at) values
  ('code-expired-2d',  'ffffffff-ffff-4fff-8fff-ffffffffffff', now() - interval '2 days'),
  ('code-expired-12h', 'ffffffff-ffff-4fff-8fff-ffffffffffff', now() - interval '12 hours'),
  ('code-live',        'ffffffff-ffff-4fff-8fff-ffffffffffff', now() + interval '10 minutes');

insert into printkit.print_jobs (vendor_id, source_kit, source_ref, payload, status, created_at, printed_at) values
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'qkit', 'printed-91d',  '{"name":"a"}', 'printed', now() - interval '100 days', now() - interval '91 days'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'qkit', 'printed-89d',  '{"name":"a"}', 'printed', now() - interval '100 days', now() - interval '89 days'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'qkit', 'printed-new',  '{"name":"a"}', 'printed', now() - interval '1 day',    now()),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'qkit', 'failed-91d',   '{"name":"a"}', 'failed',  now() - interval '91 days',  null),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'qkit', 'queued-10d',   '{"name":"a"}', 'queued',  now() - interval '10 days',  null);

insert into printkit.print_batches (id, vendor_id, source_kit, source_ref, payload, labels) values
  ('a0000000-0000-4000-8000-00000000000a', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'qkit', 'batch-old', '{"name":"a"}', '[{"i":1},{"i":2}]'),
  ('b0000000-0000-4000-8000-00000000000b', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'qkit', 'batch-mixed', '{"name":"b"}', '[{"i":1},{"i":2}]');
insert into printkit.print_jobs (vendor_id, source_kit, source_ref, payload, status, created_at, printed_at, batch_id) values
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'qkit', 'batch-old',   '{"i":1}', 'printed', now() - interval '100 days', now() - interval '95 days', 'a0000000-0000-4000-8000-00000000000a'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'qkit', 'batch-old',   '{"i":2}', 'printed', now() - interval '100 days', now() - interval '95 days', 'a0000000-0000-4000-8000-00000000000a'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'qkit', 'batch-mixed', '{"i":1}', 'printed', now() - interval '100 days', now() - interval '95 days', 'b0000000-0000-4000-8000-00000000000b'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'qkit', 'batch-mixed', '{"i":2}', 'printed', now() - interval '10 days',  now() - interval '9 days',  'b0000000-0000-4000-8000-00000000000b');

select ok(
  not has_function_privilege('authenticated', 'printkit.purge_retention()', 'execute'),
  'authenticated cannot execute purge_retention'
);
select ok(
  not has_function_privilege('anon', 'printkit.purge_retention()', 'execute'),
  'anon cannot execute purge_retention'
);
select ok(
  has_function_privilege('service_role', 'printkit.purge_retention()', 'execute'),
  'service_role can execute purge_retention'
);

select printkit.purge_retention();

select results_eq(
  $$ select payload from printkit.print_jobs where source_ref = 'printed-91d' $$,
  $$ values ('{}'::jsonb) $$,
  'job printed 91 days ago is cleared'
);
select results_eq(
  $$ select payload from printkit.print_jobs where source_ref = 'printed-89d' $$,
  $$ values ('{"name":"a"}'::jsonb) $$,
  'job printed 89 days ago keeps its payload'
);
select results_eq(
  $$ select payload from printkit.print_jobs where source_ref = 'printed-new' $$,
  $$ values ('{"name":"a"}'::jsonb) $$,
  'recently printed job keeps its payload'
);
select results_eq(
  $$ select payload from printkit.print_jobs where source_ref = 'failed-91d' $$,
  $$ values ('{}'::jsonb) $$,
  'never-printed job older than 90 days by created_at is cleared'
);
select results_eq(
  $$ select payload from printkit.print_jobs where source_ref = 'queued-10d' $$,
  $$ values ('{"name":"a"}'::jsonb) $$,
  'never-printed job younger than 90 days keeps its payload'
);
select results_eq(
  $$ select count(*) from printkit.print_jobs where source_ref in ('printed-91d', 'failed-91d') $$,
  $$ values (2::bigint) $$,
  'cleared jobs are kept as rows'
);

select results_eq(
  $$ select payload, labels from printkit.print_batches where source_ref = 'batch-old' $$,
  $$ values ('{}'::jsonb, '[{},{}]'::jsonb) $$,
  'batch whose jobs are all cleared loses its payload and labels, keeping their count'
);
select results_eq(
  $$ select payload, labels from printkit.print_batches where source_ref = 'batch-mixed' $$,
  $$ values ('{"name":"b"}'::jsonb, '[{"i":1},{"i":2}]'::jsonb) $$,
  'batch with a job still inside the window is untouched'
);

select results_eq(
  $$ select count(*) from printkit.bridge_pairing_codes where code_hash = 'code-expired-2d' $$,
  $$ values (0::bigint) $$,
  'pairing code expired over a day ago is deleted'
);
select results_eq(
  $$ select count(*) from printkit.bridge_pairing_codes where code_hash in ('code-expired-12h', 'code-live') $$,
  $$ values (2::bigint) $$,
  'pairing codes expired under a day ago or still live are kept'
);

create temp table before_second_run as
select (select jsonb_agg(to_jsonb(j) order by j.id) from printkit.print_jobs j) as jobs,
       (select jsonb_agg(to_jsonb(b) order by b.id) from printkit.print_batches b) as batches,
       (select count(*) from printkit.bridge_pairing_codes) as codes;

select printkit.purge_retention();

select ok(
  (select jobs from before_second_run) is not distinct from (select jsonb_agg(to_jsonb(j) order by j.id) from printkit.print_jobs j)
  and (select batches from before_second_run) is not distinct from (select jsonb_agg(to_jsonb(b) order by b.id) from printkit.print_batches b)
  and (select codes from before_second_run) = (select count(*) from printkit.bridge_pairing_codes),
  'a second run changes nothing'
);

set local role anon;
select throws_ok($$ select printkit.purge_retention() $$, '42501', null, 'anon execute is denied');
reset role;
set local role authenticated;
select throws_ok($$ select printkit.purge_retention() $$, '42501', null, 'authenticated execute is denied');
reset role;

select * from finish();
rollback;
