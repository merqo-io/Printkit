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

-- New jobs take a server-controlled design snapshot; retries retain the existing children.
create or replace function printkit.create_label_batch(
  p_vendor_id uuid, p_source_kit text, p_source_ref text,
  p_payload jsonb, p_labels jsonb, p_location_id uuid
) returns table(id uuid, job_ids uuid[]) language plpgsql security invoker
set search_path = '' as $$
declare b printkit.print_batches; ids uuid[]; template_snapshot jsonb;
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
    -- Serialize selection with template saves. Existing batches retain their original snapshot.
    if p_location_id is not null then
      perform pg_advisory_xact_lock(hashtextextended('sticker-template:' || p_location_id::text, 0));
      select design into template_snapshot from printkit.sticker_templates
        where location_id = p_location_id and vendor_id = p_vendor_id and active;
    end if;
    insert into printkit.print_batches(vendor_id, source_kit, source_ref, payload, labels)
      values(p_vendor_id, p_source_kit, p_source_ref, p_payload, p_labels) returning * into b;
    insert into printkit.print_jobs(vendor_id, source_kit, source_ref, payload, location_id, batch_id)
      select p_vendor_id, p_source_kit, b.id::text || ':label:' || n,
        ((p_payload || label) - '_printkit_sticker_template') || jsonb_build_object('_printkit_label_batch', 'v1', 'label_index', n::text, 'label_total', jsonb_array_length(p_labels)::text) ||
          case when template_snapshot is null then '{}'::jsonb else jsonb_build_object('_printkit_sticker_template', template_snapshot) end,
        p_location_id, b.id
      from jsonb_array_elements(p_labels) with ordinality as entries(label, n);
  end if;
  select array_agg(j.id order by j.created_at, j.source_ref) into ids from printkit.print_jobs j where j.batch_id = b.id;
  return query select b.id, ids;
end;
$$;

-- Private logo storage. Objects live under <vendor_id>/<location_id>/<file>; the bucket limits are a
-- backstop for the Server Action's own PNG/JPEG, size and dimension checks.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sticker-logos', 'sticker-logos', false, 524288, array['image/png', 'image/jpeg'])
on conflict (id) do nothing;

create policy sticker_logos_vendor_select on storage.objects
  for select to authenticated
  using (bucket_id = 'sticker-logos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy sticker_logos_vendor_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'sticker-logos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy sticker_logos_vendor_update on storage.objects
  for update to authenticated
  using (bucket_id = 'sticker-logos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'sticker-logos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy sticker_logos_vendor_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'sticker-logos' and (storage.foldername(name))[1] = (select auth.uid())::text);
