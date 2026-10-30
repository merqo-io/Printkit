-- One physical label per child job; the batch retains the caller's order ref.
create table printkit.print_batches (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references auth.users(id) on delete cascade,
  source_kit text not null,
  source_ref text not null,
  payload jsonb not null,
  labels jsonb not null check (jsonb_typeof(labels) = 'array' and jsonb_array_length(labels) between 1 and 100),
  status text not null default 'queued' check (status in ('queued', 'printed', 'failed')),
  updated_at timestamptz not null default clock_timestamp(),
  unique(source_kit, source_ref)
);
alter table printkit.print_batches enable row level security;
create policy print_batches_vendor_select on printkit.print_batches
  for select to authenticated using ((select auth.uid()) = vendor_id);
grant select on printkit.print_batches to authenticated;
grant all on printkit.print_batches to service_role;
alter table printkit.print_jobs add column batch_id uuid references printkit.print_batches(id) on delete cascade;
create index print_jobs_batch_idx on printkit.print_jobs(batch_id);

-- Serialize the legacy and batch namespaces, including mixed-version callers.
create function printkit.guard_batch_source() returns trigger language plpgsql
set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.source_kit || ':' || new.source_ref, 0));
  if new.batch_id is null and exists (
    select 1 from printkit.print_batches b where b.source_kit = new.source_kit and b.source_ref = new.source_ref
  ) then raise unique_violation using message = 'Print batch already exists'; end if;
  return new;
end;
$$;
create trigger guard_batch_source before insert on printkit.print_jobs
for each row execute function printkit.guard_batch_source();

create function printkit.create_label_batch(
  p_vendor_id uuid, p_source_kit text, p_source_ref text,
  p_payload jsonb, p_labels jsonb, p_location_id uuid
) returns table(id uuid, job_ids uuid[]) language plpgsql security invoker
set search_path = '' as $$
declare b printkit.print_batches; ids uuid[];
begin
  if jsonb_typeof(p_labels) <> 'array' or jsonb_array_length(p_labels) not between 1 and 100 then
    raise check_violation using message = 'Invalid label count';
  end if;
  if p_location_id is not null and not exists (
    select 1 from printkit.print_locations l where l.id = p_location_id and l.vendor_id = p_vendor_id and l.active
  ) then raise check_violation using message = 'Invalid location'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_source_kit || ':' || p_source_ref, 0));
  if exists (select 1 from printkit.print_jobs j where j.source_kit = p_source_kit and j.source_ref = p_source_ref) then
    raise unique_violation using message = 'Legacy print job already exists';
  end if;
  select * into b from printkit.print_batches where source_kit = p_source_kit and source_ref = p_source_ref;
  if found then
    if b.vendor_id <> p_vendor_id or b.payload <> p_payload or b.labels <> p_labels then
      raise check_violation using message = 'Batch differs from original request';
    end if;
  else
    insert into printkit.print_batches(vendor_id, source_kit, source_ref, payload, labels)
      values(p_vendor_id, p_source_kit, p_source_ref, p_payload, p_labels) returning * into b;
    insert into printkit.print_jobs(vendor_id, source_kit, source_ref, payload, location_id, batch_id)
      select p_vendor_id, p_source_kit, b.id::text || ':label:' || n,
        p_payload || label || jsonb_build_object('_printkit_label_batch', 'v1', 'label_index', n::text, 'label_total', jsonb_array_length(p_labels)::text),
        p_location_id, b.id
      from jsonb_array_elements(p_labels) with ordinality as entries(label, n);
  end if;
  select array_agg(j.id order by j.created_at, j.source_ref) into ids from printkit.print_jobs j where j.batch_id = b.id;
  return query select b.id, ids;
end;
$$;

-- Lock before reading children so concurrent completions cannot lose progress.
create function printkit.label_batch_status(p_batch_id uuid)
returns table(source_kit text, source_ref text, status text, updated_at timestamptz)
language plpgsql security invoker set search_path = '' as $$
declare b printkit.print_batches; next_status text;
begin
  select * into b from printkit.print_batches where id = p_batch_id for update;
  if not found then return; end if;
  select case
    when count(*) <> jsonb_array_length(b.labels) then 'failed'
    when bool_or(j.status = 'failed') then 'failed'
    when bool_and(j.status = 'printed') then 'printed'
    else 'queued' end into next_status
  from printkit.print_jobs j where j.batch_id = b.id;
  if b.status <> next_status then
    update printkit.print_batches set status = next_status,
      updated_at = greatest(clock_timestamp(), b.updated_at + interval '1 microsecond')
      where id = b.id returning * into b;
  end if;
  return query select b.source_kit, b.source_ref, b.status, b.updated_at;
end;
$$;
revoke all on function printkit.guard_batch_source() from public, anon, authenticated;
revoke all on function printkit.create_label_batch(uuid,text,text,jsonb,jsonb,uuid) from public, anon, authenticated;
revoke all on function printkit.label_batch_status(uuid) from public, anon, authenticated;
grant execute on function printkit.create_label_batch(uuid,text,text,jsonb,jsonb,uuid) to service_role;
grant execute on function printkit.label_batch_status(uuid) to service_role;
