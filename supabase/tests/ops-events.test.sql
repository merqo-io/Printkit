begin;
select plan(11);

select has_table('printkit', 'ops_events', 'ops_events table exists');

select is(
  (select relrowsecurity from pg_class
   where oid = 'printkit.ops_events'::regclass),
  true,
  'ops_events has RLS enabled'
);

insert into auth.users (id, email) values
  ('33333333-3333-3333-3333-333333333333', 'vendor-ops@test.dev');

insert into printkit.ops_events (vendor_id, kind, ref, code, created_at) values
  ('33333333-3333-3333-3333-333333333333', 'print_failed', 'job-old', 'expired', now() - interval '31 days'),
  ('33333333-3333-3333-3333-333333333333', 'print_failed', 'job-new', 'expired', now() - interval '29 days');

set local role authenticated;
set local request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333"}';

select throws_ok(
  $$ select count(*) from printkit.ops_events $$,
  '42501',
  null,
  'authenticated cannot select ops_events, even its own rows'
);

select throws_ok(
  $$ insert into printkit.ops_events (vendor_id, kind, ref, code)
     values ('33333333-3333-3333-3333-333333333333', 'print_failed', 'x', 'y') $$,
  '42501',
  null,
  'authenticated cannot insert into ops_events'
);

reset role;
set local role anon;

select throws_ok(
  $$ select count(*) from printkit.ops_events $$,
  '42501',
  null,
  'anon cannot select ops_events'
);

select throws_ok(
  $$ insert into printkit.ops_events (vendor_id, kind, ref, code)
     values ('33333333-3333-3333-3333-333333333333', 'print_failed', 'x', 'y') $$,
  '42501',
  null,
  'anon cannot insert into ops_events'
);

reset role;

select throws_ok(
  $$ insert into printkit.ops_events (vendor_id, kind, ref, code)
     values ('33333333-3333-3333-3333-333333333333', 'other', 'x', 'y') $$,
  '23514',
  null,
  'kind check rejects an unknown kind'
);

select throws_ok(
  $$ insert into printkit.ops_events (vendor_id, kind, ref, code)
     values ('33333333-3333-3333-3333-333333333333', 'print_failed', repeat('r', 65), 'y') $$,
  '23514',
  null,
  'ref longer than 64 characters is rejected'
);

select ok(
  not has_function_privilege('authenticated', 'printkit.purge_ops_events()', 'execute'),
  'authenticated cannot execute purge_ops_events'
);

select printkit.purge_ops_events();

select results_eq(
  $$ select count(*) from printkit.ops_events where ref = 'job-old' $$,
  $$ values (0::bigint) $$,
  'purge deletes a 31-day-old row'
);

select results_eq(
  $$ select count(*) from printkit.ops_events where ref = 'job-new' $$,
  $$ values (1::bigint) $$,
  'purge keeps a 29-day-old row'
);

select * from finish();
rollback;
