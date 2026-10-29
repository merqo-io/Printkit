-- Runs in an isolated disposable PostgreSQL cluster via scripts/test-label-batches.mjs.
insert into auth.users(id) values ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222');
insert into printkit.print_locations(id,vendor_id,source_kit,source_ref,label)
values ('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','qkit','booth','Cart');
set role service_role;
do $$
declare b uuid; again uuid; ids uuid[]; s text; t timestamptz; previous timestamptz;
begin
  select id,job_ids into b,ids from printkit.create_label_batch(
    '11111111-1111-4111-8111-111111111111','qkit','order',
    '{"customer_name":"Ann","order_number":"007"}',
    '[{"item_name":"Kopi"},{"item_name":"Kopi"},{"item_name":"Tea"}]',
    '33333333-3333-4333-8333-333333333333');
  assert cardinality(ids) = 3, 'one job per physical unit';
  for again in select unnest(ids) loop
    assert (select count(*) from printkit.claim_job('33333333-3333-4333-8333-333333333333', again))=1, 'each connector can claim one ordinary label';
    assert (select count(*) from printkit.claim_job('33333333-3333-4333-8333-333333333333', again))=0, 'reconnect cannot claim an already sent label';
  end loop;
  assert (select count(*) from printkit.print_jobs where batch_id=b and job_type='label' and payload->>'label_total'='3') = 3;
  select id into again from printkit.create_label_batch(
    '11111111-1111-4111-8111-111111111111','qkit','order',
    '{"customer_name":"Ann","order_number":"007"}',
    '[{"item_name":"Kopi"},{"item_name":"Kopi"},{"item_name":"Tea"}]',null);
  assert b=again and (select count(*) from printkit.print_jobs where batch_id=b)=3, 'retry must not duplicate';
  update printkit.print_jobs set status='printed' where id=ids[1];
  select status into s from printkit.label_batch_status(b);
  assert s='queued', 'first label cannot complete order';
  update printkit.print_jobs set status='failed' where id=ids[2];
  select status,updated_at into s,previous from printkit.label_batch_status(b);
  assert s='failed', 'partial failure must fail batch';
  update printkit.print_jobs set status='printed' where id=ids[3];
  select status into s from printkit.label_batch_status(b);
  assert s='failed', 'later success cannot mask failed sibling';
  update printkit.print_jobs set status='queued' where id=ids[2];
  select status into s from printkit.label_batch_status(b);
  assert s='queued';
  update printkit.print_jobs set status='printed' where id=ids[2];
  select status,updated_at into s,t from printkit.label_batch_status(b);
  assert s='printed' and t>previous, 'all units acknowledged with newer callback revision';
  begin
    perform printkit.create_label_batch('11111111-1111-4111-8111-111111111111','qkit','order','{}','[{"item_name":"Changed"}]',null);
    raise exception 'changed payload accepted';
  exception when check_violation then null; end;
  begin
    insert into printkit.print_jobs(vendor_id,source_kit,source_ref,payload) values('11111111-1111-4111-8111-111111111111','qkit','order','{}');
    raise exception 'legacy duplicate accepted';
  exception when unique_violation then null; end;
  insert into printkit.print_jobs(vendor_id,source_kit,source_ref,payload) values('11111111-1111-4111-8111-111111111111','qkit','legacy','{}');
  begin
    perform printkit.create_label_batch('11111111-1111-4111-8111-111111111111','qkit','legacy','{}','[{"item_name":"Kopi"}]',null);
    raise exception 'legacy order converted into extra labels';
  exception when unique_violation then null; end;
  begin
    perform printkit.create_label_batch('22222222-2222-4222-8222-222222222222','qkit','wrong-location','{}','[{"item_name":"Kopi"}]','33333333-3333-4333-8333-333333333333');
    raise exception 'cross-vendor location accepted';
  exception when check_violation then null; end;
  begin
    perform printkit.create_label_batch('11111111-1111-4111-8111-111111111111','qkit','empty','{}','[]',null);
    raise exception 'empty batch accepted';
  exception when check_violation then null; end;
  assert not exists(select 1 from printkit.print_batches where source_ref in ('legacy','wrong-location','empty')), 'failed transaction leaves no partial batch';
end;
$$;
reset role;
create function printkit.reject_test_label() returns trigger language plpgsql as $$
begin
  if new.payload->>'item_name'='Break' then raise check_violation; end if;
  return new;
end $$;
create trigger reject_test_label before insert on printkit.print_jobs for each row execute function printkit.reject_test_label();
set role service_role;
do $$ begin
  begin
    perform printkit.create_label_batch('11111111-1111-4111-8111-111111111111','qkit','atomic-failure','{}','[{"item_name":"Kopi"},{"item_name":"Break"}]',null);
    raise exception 'partial batch accepted';
  exception when check_violation then null; end;
  assert not exists(select 1 from printkit.print_batches where source_ref='atomic-failure'), 'second child rejection rolls back the parent and first child';
end $$;
reset role;
drop trigger reject_test_label on printkit.print_jobs;
drop function printkit.reject_test_label();
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
do $$ begin
  assert (select count(*) from printkit.print_batches)=0, 'RLS hides other vendors';
  assert not has_function_privilege('authenticated','printkit.create_label_batch(uuid,text,text,jsonb,jsonb,uuid)','execute');
  assert not has_function_privilege('anon','printkit.label_batch_status(uuid)','execute');
end $$;
reset role;
