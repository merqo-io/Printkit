-- Fixed-window limiter for the public pairing and CloudPRNT routes, same shape as paykit's.
create table printkit.rate_limits (
  key          text        not null,
  window_start timestamptz not null,
  count        int         not null default 0,
  primary key (key, window_start)
);

create index rate_limits_window_start_idx on printkit.rate_limits (window_start);

-- No policies: only check_rate_limit and the service role touch it.
alter table printkit.rate_limits enable row level security;
revoke all on printkit.rate_limits from public, anon, authenticated;

create or replace function printkit.check_rate_limit(
  p_key text, p_limit int, p_window_seconds int
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_window timestamptz;
  v_count int;
begin
  if p_key is null or pg_catalog.length(p_key) not between 1 and 255
     or p_limit is null or p_limit not between 1 and 100000
     or p_window_seconds is null or p_window_seconds not between 1 and 86400 then
    raise exception 'invalid rate limit parameters' using errcode = '22023';
  end if;

  v_window := pg_catalog.to_timestamp(
    pg_catalog.floor(extract(epoch from pg_catalog.now()) / p_window_seconds) * p_window_seconds
  );
  insert into printkit.rate_limits (key, window_start, count)
    values (p_key, v_window, 1)
    on conflict (key, window_start) do update
      set count = least(printkit.rate_limits.count::bigint + 1, 2147483647)::int
    returning count into v_count;

  -- Index-backed cleanup on a sample of calls; keeps the longest supported window.
  if pg_catalog.random() < 0.02 then
    delete from printkit.rate_limits
      where window_start < pg_catalog.now() - interval '1 day';
  end if;
  return v_count <= p_limit;
end;
$$;

revoke execute on function printkit.check_rate_limit(text, int, int)
  from public, anon, authenticated;
grant execute on function printkit.check_rate_limit(text, int, int) to service_role;
