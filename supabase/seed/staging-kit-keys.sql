-- Staging-only: registers qkit as a printkit caller on the STAGING project.
-- Run in its SQL Editor after printkit's schema is loaded (merqo's docs/STAGING.md).
-- __QKIT_PRINTKIT_KIT_SECRET__ is the hex value of qkit's Preview PRINTKIT_KIT_SECRET
-- (qkit sends it as "qkit:<hex>"); __QKIT_PRINTKIT_CALLBACK_SECRET__ is qkit's
-- Preview PRINTKIT_CALLBACK_SECRET. Both staging-only, never the production ones.

do $$
begin
  if exists (
    select 1 from merqo.products
    where app_url ~ '^https://(www|qkit|loopkit|paykit|stockkit|printkit)\.merqo\.io'
  ) then
    raise exception 'merqo.products points at production hosts: this is not the staging project';
  end if;
end $$;

create temporary table staging_qkit_key (kit_secret text, callback_secret text);

insert into staging_qkit_key values (
  '__QKIT_PRINTKIT_KIT_SECRET__',
  '__QKIT_PRINTKIT_CALLBACK_SECRET__'
);

do $$
begin
  if exists (
    select 1 from staging_qkit_key
    where kit_secret like '\_\_%' or callback_secret like '\_\_%'
  ) then
    raise exception 'replace every __PLACEHOLDER__ first';
  end if;
end $$;

insert into printkit.kit_api_keys (kit_slug, secret_hash, callback_url, callback_secret)
select 'qkit',
       encode(sha256(convert_to(kit_secret, 'UTF8')), 'hex'),
       'https://qkit-staging.merqo.io/api/printkit/print-status',
       callback_secret
from staging_qkit_key
on conflict (kit_slug) do update
set secret_hash     = excluded.secret_hash,
    callback_url    = excluded.callback_url,
    callback_secret = excluded.callback_secret;

drop table staging_qkit_key;
