begin;
select no_plan();

select ok(not has_table_privilege(r, 'printkit.rate_limits', p), r || ' has no ' || p || ' on rate_limits')
from unnest(array['anon', 'authenticated']) r, unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE']) p;

set local role anon;
select throws_ok($$ select printkit.check_rate_limit('acl-negative', 2, 60) $$,
  '42501', null, 'anonymous caller cannot create or exhaust limiter counters');
reset role;
set local role authenticated;
select throws_ok($$ select printkit.check_rate_limit('acl-negative', 2, 60) $$,
  '42501', null, 'authenticated caller cannot create or exhaust limiter counters');
reset role;
select is_empty($$ select 1 from printkit.rate_limits where key = 'acl-negative' $$,
  'denied callers left counters unchanged');

set local role service_role;
select is(printkit.check_rate_limit('acl-service', 2, 60), true, 'first service hit allowed');
select is(printkit.check_rate_limit('acl-service', 2, 60), true, 'second service hit allowed');
select is(printkit.check_rate_limit('acl-service', 2, 60), false, 'same-window third service hit denied');
select is(printkit.check_rate_limit('acl-independent', 2, 60), true, 'different key has its own counter');
select throws_ok($$ select printkit.check_rate_limit(null, 2, 60) $$, '22023', null, 'null key rejected');
select throws_ok($$ select printkit.check_rate_limit('', 2, 60) $$, '22023', null, 'empty key rejected');
select throws_ok($$ select printkit.check_rate_limit(repeat('x', 256), 2, 60) $$, '22023', null, 'oversized key rejected');
select throws_ok($$ select printkit.check_rate_limit('bad-limit', 0, 60) $$, '22023', null, 'zero limit rejected');
select throws_ok($$ select printkit.check_rate_limit('bad-window', 2, 86401) $$, '22023', null, 'oversized window rejected');
reset role;

select is((select count from printkit.rate_limits where key = 'acl-service'), 3, 'atomic conflict update recorded all three hits');
insert into printkit.rate_limits (key, window_start, count)
  values ('acl-old-window', now() - interval '2 days', 100000);
set local role service_role;
select is(printkit.check_rate_limit('acl-old-window', 1, 60), true, 'expired window does not consume current allowance');
reset role;

select * from finish();
rollback;
