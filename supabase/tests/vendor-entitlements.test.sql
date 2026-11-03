begin;
select plan(19);

insert into auth.users (id, email) values
  ('e1111111-1111-4111-8111-111111111111', 'ent-a@test.dev'),
  ('e2222222-2222-4222-8222-222222222222', 'ent-b@test.dev');

select has_table('printkit', 'vendor_entitlements', 'printkit.vendor_entitlements exists');
select ok((select relrowsecurity from pg_class where oid = 'printkit.vendor_entitlements'::regclass), 'RLS on vendor_entitlements');
select ok(not has_function_privilege('authenticated', 'printkit.apply_vendor_entitlement(text,text,boolean,text,timestamptz,timestamptz,timestamptz,timestamptz)', 'execute'), 'authenticated cannot apply an entitlement');
select ok(not has_function_privilege('anon', 'printkit.apply_vendor_entitlement(text,text,boolean,text,timestamptz,timestamptz,timestamptz,timestamptz)', 'execute'), 'anon cannot apply an entitlement');
select ok(has_function_privilege('service_role', 'printkit.apply_vendor_entitlement(text,text,boolean,text,timestamptz,timestamptz,timestamptz,timestamptz)', 'execute'), 'service_role can apply an entitlement');
select ok(not has_function_privilege('authenticated', 'printkit.vendor_has_label_access(uuid)', 'execute'), 'authenticated cannot call the access helper');
select ok(has_function_privilege('service_role', 'printkit.vendor_has_label_access(uuid)', 'execute'), 'service_role can call the access helper');
select ok(not has_table_privilege('authenticated', 'printkit.vendor_entitlements', 'insert'), 'authenticated has no write grant');

select is(printkit.apply_vendor_entitlement('nobody@test.dev', 'paid', false, '24h', null, null, null, '2026-11-01T00:00:00Z'), 'unknown_vendor', 'unknown email is reported');
select is(printkit.vendor_has_label_access('e1111111-1111-4111-8111-111111111111'), false, 'no row means no access');

select is(printkit.apply_vendor_entitlement('Ent-A@Test.Dev', 'paid', false, '24h', null, null, '2099-01-01T00:00:00Z', '2026-11-01T00:00:00Z'), 'stored', 'first push stored, email matched case-insensitively');
select is(printkit.vendor_has_label_access('e1111111-1111-4111-8111-111111111111'), true, 'live paid row grants access');
select is(printkit.apply_vendor_entitlement('ent-a@test.dev', 'free', false, '24h', null, null, null, '2026-10-01T00:00:00Z'), 'stale', 'an older issued_at is a no-op');
select is(printkit.vendor_has_label_access('e1111111-1111-4111-8111-111111111111'), true, 'a stale push leaves access alone');

select printkit.apply_vendor_entitlement('ent-a@test.dev', 'paid', false, '24h', null, null, '2000-01-01T00:00:00Z', '2026-11-02T00:00:00Z');
select is(printkit.vendor_has_label_access('e1111111-1111-4111-8111-111111111111'), false, 'a lapsed valid_until denies access with no push');

select printkit.apply_vendor_entitlement('ent-a@test.dev', 'free', false, '24h', now() - interval '1 hour', now() + interval '1 hour', null, '2026-11-03T00:00:00Z');
select is(printkit.vendor_has_label_access('e1111111-1111-4111-8111-111111111111'), true, 'a running event pass grants access on a free tier');

select printkit.apply_vendor_entitlement('ent-a@test.dev', 'free', false, '24h', now() - interval '2 hours', now() - interval '1 hour', null, '2026-11-04T00:00:00Z');
select is(printkit.vendor_has_label_access('e1111111-1111-4111-8111-111111111111'), false, 'an expired event pass denies access');

-- Own-row read: vendor B sees nothing, vendor A sees the one row.
set local role authenticated;
set local request.jwt.claims = '{"sub":"e2222222-2222-4222-8222-222222222222"}';
select results_eq($$ select count(*) from printkit.vendor_entitlements $$, $$ values (0::bigint) $$, 'another vendor cannot read the row');
set local request.jwt.claims = '{"sub":"e1111111-1111-4111-8111-111111111111"}';
select results_eq($$ select count(*) from printkit.vendor_entitlements $$, $$ values (1::bigint) $$, 'owner reads their own row');

select * from finish();
rollback;
