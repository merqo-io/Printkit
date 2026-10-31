begin;
select plan(21);
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

-- Logo bucket isolation: vendor A owns the 'aaaa...' folder, vendor B the 'bbbb...' one.
reset role;
insert into storage.objects (bucket_id, name, owner_id) values
  ('sticker-logos', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/loc/a.png', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('sticker-logos', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/loc/b.png', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
select results_eq($$ select public, file_size_limit from storage.buckets where id = 'sticker-logos' $$, $$ values (false, 524288::bigint) $$, 'logo bucket is private with a 512 KB limit');
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}';
select results_eq($$ select name from storage.objects where bucket_id = 'sticker-logos' $$, $$ values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/loc/a.png'::text) $$, 'vendor reads only their own logos');
select lives_ok($$ insert into storage.objects (bucket_id, name, owner_id) values ('sticker-logos', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/loc/new.png', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') $$, 'vendor can write inside their own folder');
select throws_ok($$ insert into storage.objects (bucket_id, name, owner_id) values ('sticker-logos', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/loc/evil.png', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') $$, '42501', null, 'vendor cannot write into another vendor folder');
select results_eq($$ with d as (delete from storage.objects where bucket_id = 'sticker-logos' and name like 'bbbbbbbb%' returning 1) select count(*) from d $$, $$ values (0::bigint) $$, 'vendor cannot delete another vendor logo');
select results_eq($$ with u as (update storage.objects set name = name where bucket_id = 'sticker-logos' and name like 'bbbbbbbb%' returning 1) select count(*) from u $$, $$ values (0::bigint) $$, 'vendor cannot update another vendor logo');
reset role;
set local role anon;
select results_eq($$ select count(*) from storage.objects where bucket_id = 'sticker-logos' $$, $$ values (0::bigint) $$, 'anonymous users cannot read logos');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"}';
select results_eq($$ select count(*) from storage.objects where bucket_id = 'sticker-logos' and name like 'aaaaaaaa%' $$, $$ values (0::bigint) $$, 'another vendor cannot read these logos');
select * from finish();
rollback;
