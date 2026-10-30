begin;
select plan(13);
insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'sticker-a@test.dev'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'sticker-b@test.dev');
insert into printkit.print_locations (id, vendor_id, source_kit, source_ref, label)
values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'qkit', 'sticker-test', 'Test');
select ok(not has_function_privilege('authenticated', 'printkit.save_sticker_template(uuid,uuid,jsonb)', 'execute'), 'authenticated cannot call the service-only save function');
select ok(not has_function_privilege('anon', 'printkit.save_sticker_template(uuid,uuid,jsonb)', 'execute'), 'anon cannot call the save function');
set local role service_role;
select lives_ok($$ select printkit.save_sticker_template('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '{"version":1}') $$, 'owner design can be saved');
select lives_ok($$ select printkit.save_sticker_template('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '{"version":2}') $$, 'subsequent save creates another version');
select results_eq($$ select count(*) from printkit.sticker_templates where active $$, $$ values (1::bigint) $$, 'only one version is active');
select results_eq($$ select count(*) from printkit.sticker_templates $$, $$ values (2::bigint) $$, 'older version remains available');
select throws_ok($$ select printkit.save_sticker_template('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '{}') $$, '42501', null, 'wrong vendor cannot save another booth');

select lives_ok($$ select * from printkit.create_label_batch('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'qkit', 'snapshot-test', '{"_printkit_sticker_template":{"version":99}}', '[{"item_name":"Kopi"}]', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc') $$, 'batch takes a design snapshot');
select results_eq($$ select payload->'_printkit_sticker_template'->>'version' from printkit.print_jobs where batch_id is not null $$, $$ values ('2'::text) $$, 'server snapshot overrides caller-supplied design');
select printkit.save_sticker_template('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '{"version":3}');
select lives_ok($$ select * from printkit.create_label_batch('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'qkit', 'snapshot-test', '{"_printkit_sticker_template":{"version":99}}', '[{"item_name":"Kopi"}]', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc') $$, 'retry is idempotent after a design change');
select results_eq($$ select payload->'_printkit_sticker_template'->>'version' from printkit.print_jobs where batch_id is not null $$, $$ values ('2'::text) $$, 'retry preserves original snapshot');

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"}';
select results_eq($$ select count(*) from printkit.sticker_templates $$, $$ values (0::bigint) $$, 'another vendor cannot read designs');
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}';
select results_eq($$ select count(*) from printkit.sticker_templates $$, $$ values (3::bigint) $$, 'owner can read their designs');
select * from finish();
rollback;
