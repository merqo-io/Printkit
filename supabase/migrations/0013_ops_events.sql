-- Only kinds printkit writes; print_stuck is computed from print_jobs.
-- ref is a print job id and code a short machine code: no PII.
create table printkit.ops_events (
  id         bigint generated always as identity primary key,
  vendor_id  uuid not null references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('print_failed', 'webhook_rejected')),
  ref        text not null check (char_length(ref) <= 64),
  code       text not null check (char_length(code) <= 64),
  created_at timestamptz not null default now()
);
create index ops_events_vendor_created_idx
  on printkit.ops_events (vendor_id, created_at desc);

-- Service-role only: RLS on with zero policies, no anon/authenticated grant.
alter table printkit.ops_events enable row level security;
revoke all on printkit.ops_events from public, anon, authenticated;
grant select, insert on printkit.ops_events to service_role;

create or replace function printkit.purge_ops_events()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from printkit.ops_events where created_at < now() - interval '30 days';
$$;

revoke execute on function printkit.purge_ops_events() from public, anon, authenticated;
grant execute on function printkit.purge_ops_events() to service_role;

-- Best-effort schedule: the migration must not fail where pg_cron is missing.
-- cron.schedule replaces a job of the same name, so re-running is safe.
do $do$
begin
  if not exists (
    select 1 from pg_available_extensions where name = 'pg_cron'
  ) then
    raise notice 'pg_cron is not available: printkit.purge_ops_events() is not scheduled';
    return;
  end if;

  create extension if not exists pg_cron;
  perform cron.schedule(
    'printkit-ops-events-purge',
    '17 3 * * *',
    'select printkit.purge_ops_events()'
  );
  raise notice 'printkit.purge_ops_events() scheduled daily';
exception when others then
  raise notice 'printkit.purge_ops_events() was not scheduled: %', sqlerrm;
end
$do$;
