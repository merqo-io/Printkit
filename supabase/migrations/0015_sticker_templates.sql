-- Versioned booth templates; each print job will retain its own immutable snapshot.
create table printkit.sticker_templates (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references printkit.print_locations(id) on delete cascade,
  vendor_id uuid not null references auth.users(id) on delete cascade,
  version integer not null check (version > 0),
  design jsonb not null check (jsonb_typeof(design) = 'object' and octet_length(design::text) <= 32768),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (location_id, version)
);
create unique index sticker_templates_one_active on printkit.sticker_templates(location_id) where active;
alter table printkit.sticker_templates enable row level security;
create policy sticker_templates_vendor_select on printkit.sticker_templates
  for select to authenticated using ((select auth.uid()) = vendor_id);
grant select on printkit.sticker_templates to authenticated;
grant all on printkit.sticker_templates to service_role;

-- Only a trusted server may save, and it must supply the owning vendor.
create function printkit.save_sticker_template(p_location_id uuid, p_vendor_id uuid, p_design jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare next_version integer; result_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('sticker-template:' || p_location_id::text, 0));
  if not exists (select 1 from printkit.print_locations where id = p_location_id and vendor_id = p_vendor_id and active) then
    raise exception 'Unknown booth' using errcode = '42501';
  end if;
  select coalesce(max(version), 0) + 1 into next_version from printkit.sticker_templates where location_id = p_location_id;
  update printkit.sticker_templates set active = false where location_id = p_location_id and active;
  insert into printkit.sticker_templates(location_id, vendor_id, version, design)
    values (p_location_id, p_vendor_id, next_version, p_design) returning id into result_id;
  return result_id;
end;
$$;
revoke all on function printkit.save_sticker_template(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function printkit.save_sticker_template(uuid, uuid, jsonb) to service_role;
