-- Merqo owns subscriptions and event passes and pushes each vendor's
-- entitlement here. This table caches that push; the label gate reads only it.
-- printkit never had plan or pricing columns, so there is nothing to migrate
-- from: a vendor with no row has no label access until merqo pushes.
create table printkit.vendor_entitlements (
  vendor_id             uuid primary key references auth.users(id) on delete cascade,
  tier                  text not null check (tier in ('free', 'paid')),
  founder               boolean not null default false,
  stats_window          text not null default '24h' check (stats_window in ('24h', '90d')),
  event_pass_starts_at  timestamptz,
  event_pass_ends_at    timestamptz,
  valid_until           timestamptz,
  issued_at             timestamptz not null,
  updated_at            timestamptz not null default now(),
  check ((event_pass_starts_at is null) = (event_pass_ends_at is null))
);

alter table printkit.vendor_entitlements enable row level security;

create policy vendor_entitlements_self_select on printkit.vendor_entitlements
  for select to authenticated using (vendor_id = (select auth.uid()));

-- Writes happen only through apply_vendor_entitlement (service role).
revoke all on printkit.vendor_entitlements from public, anon, authenticated;
grant select on printkit.vendor_entitlements to authenticated;
grant all on printkit.vendor_entitlements to service_role;

-- Maps the pushed email to auth.users and upserts in one statement. The WHERE
-- on the conflict branch makes the issued_at ordering atomic: a stale or
-- replayed push updates nothing and returns 'stale'.
create function printkit.apply_vendor_entitlement(
  p_email text,
  p_tier text,
  p_founder boolean,
  p_stats_window text,
  p_event_pass_starts_at timestamptz,
  p_event_pass_ends_at timestamptz,
  p_valid_until timestamptz,
  p_issued_at timestamptz
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_vendor uuid;
  v_written uuid;
begin
  select id into v_vendor from auth.users where lower(email) = lower(p_email) limit 1;
  if v_vendor is null then return 'unknown_vendor'; end if;

  insert into printkit.vendor_entitlements as e
    (vendor_id, tier, founder, stats_window, event_pass_starts_at, event_pass_ends_at, valid_until, issued_at, updated_at)
  values (v_vendor, p_tier, p_founder, p_stats_window, p_event_pass_starts_at, p_event_pass_ends_at, p_valid_until, p_issued_at, now())
  on conflict (vendor_id) do update set
    tier = excluded.tier,
    founder = excluded.founder,
    stats_window = excluded.stats_window,
    event_pass_starts_at = excluded.event_pass_starts_at,
    event_pass_ends_at = excluded.event_pass_ends_at,
    valid_until = excluded.valid_until,
    issued_at = excluded.issued_at,
    updated_at = now()
  where e.issued_at < excluded.issued_at
  returning e.vendor_id into v_written;

  return case when v_written is null then 'stale' else 'stored' end;
end;
$$;
revoke all on function printkit.apply_vendor_entitlement(text, text, boolean, text, timestamptz, timestamptz, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function printkit.apply_vendor_entitlement(text, text, boolean, text, timestamptz, timestamptz, timestamptz, timestamptz)
  to service_role;

-- The single definition of label access. Merqo has no cron, so a lapse must
-- apply here by comparing against now() rather than waiting for a push.
create function printkit.vendor_has_label_access(p_vendor uuid)
returns boolean
language sql security definer stable set search_path = '' as $$
  select exists (
    select 1 from printkit.vendor_entitlements
    where vendor_id = p_vendor
      and (
        (tier = 'paid' and (valid_until is null or valid_until > now()))
        or (event_pass_starts_at <= now() and now() < event_pass_ends_at)
      )
  );
$$;
revoke all on function printkit.vendor_has_label_access(uuid) from public, anon, authenticated;
grant execute on function printkit.vendor_has_label_access(uuid) to service_role;
