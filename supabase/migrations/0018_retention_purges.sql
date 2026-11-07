-- PDPA retention limitation: the privacy notice promises that printkit
-- label-job data is kept 90 days after the label is printed, and that
-- pairing codes do not outlive their purpose.
--
-- Retention periods:
--   table                  what is purged                       when
--   print_jobs             payload cleared to '{}'              90 days after printed_at; for a job
--                                                               never printed, 90 days after created_at
--   print_batches          payload cleared to '{}', labels      once every child print_job is cleared
--                          replaced by '{}' objects
--   bridge_pairing_codes   row deleted                          1 day after expires_at
--
-- Jobs and batches are not deleted: history counts and metrics still read
-- their status and timestamps, which carry no customer data. Only the
-- payload (customer name, order details) is erased. A batch is cleared by
-- following its jobs rather than by its own clock, because print_batches has
-- no created_at and a batch must never lose labels that a job still prints
-- from. Its labels array keeps its length so the 1-100 length check holds.
--
-- A queued or sent job older than 90 days is first marked failed
-- (failure_reason 'expired'): a label that old is useless, and clearing its
-- payload mid-flight would let it print blank. Only terminal jobs (printed or
-- failed) are then cleared. This is a plain database update: it makes no
-- callback to the originating kit.
--
-- A batch with zero jobs is cleared immediately; that is harmless because
-- create_label_batch always inserts the batch and its jobs together.
--
-- Ingest retry: create_label_batch compares the stored batch payload with the
-- retried one for an existing (source_kit, source_ref). Once a batch is
-- cleared a retry no longer matches and is rejected as a payload mismatch.
-- That is acceptable: a retry after 90 days is not a genuine retry.
--
-- Reprint: a cleared job carries an empty payload, so reprinting it would
-- print a blank label; the reprint action refuses it instead.
--
-- Idempotent: only rows whose payload is not already '{}' are touched, and
-- the cron job is replaced by name when scheduled again.

create or replace function printkit.purge_retention()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update printkit.print_jobs
     set status = 'failed',
         failure_reason = 'expired'
   where status in ('queued', 'sent')
     and created_at < now() - interval '90 days';

  update printkit.print_jobs
     set payload = '{}'::jsonb
   where payload <> '{}'::jsonb
     and status in ('printed', 'failed')
     and coalesce(printed_at, created_at) < now() - interval '90 days';

  -- Rewriting labels as '{}' objects keeps its array length, so a second run
  -- finds a batch whose payload is already '{}' and skips it.
  update printkit.print_batches b
     set payload = '{}'::jsonb,
         labels = (
           select jsonb_agg('{}'::jsonb)
             from jsonb_array_elements(b.labels)
         )
   where b.payload <> '{}'::jsonb
     and not exists (
       select 1 from printkit.print_jobs j
        where j.batch_id = b.id and j.payload <> '{}'::jsonb
     );

  delete from printkit.bridge_pairing_codes
   where expires_at < now() - interval '1 day';
end;
$$;

revoke execute on function printkit.purge_retention() from public, anon, authenticated;
grant execute on function printkit.purge_retention() to service_role;

-- Best-effort schedule: the migration must not fail where pg_cron is missing.
-- cron.schedule replaces a job of the same name, so re-running is safe.
do $do$
begin
  if not exists (
    select 1 from pg_available_extensions where name = 'pg_cron'
  ) then
    raise notice 'pg_cron is not available: printkit.purge_retention() is not scheduled';
    return;
  end if;

  create extension if not exists pg_cron;
  perform cron.schedule(
    'printkit-retention-purge',
    '37 3 * * *',
    'select printkit.purge_retention()'
  );
  raise notice 'printkit.purge_retention() scheduled daily';
exception when others then
  raise notice 'printkit.purge_retention() was not scheduled: %', sqlerrm;
end
$do$;
