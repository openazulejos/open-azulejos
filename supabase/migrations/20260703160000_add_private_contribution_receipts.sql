alter table public.azulejos
add column if not exists moderation_reason text,
add column if not exists condition_codes text[] not null default '{}'::text[];

alter table public.azulejos
drop constraint if exists azulejos_moderation_reason_length,
drop constraint if exists azulejos_condition_codes_check;

alter table public.azulejos
add constraint azulejos_moderation_reason_length
check (moderation_reason is null or length(moderation_reason) between 1 and 240),
add constraint azulejos_condition_codes_check
check (
  condition_codes <@ array[
    'intact',
    'crazed',
    'chipped',
    'missing',
    'painted-covered',
    'repaired',
    'unknown'
  ]::text[]
);

alter table public.contributions
add column if not exists receipt_token_hash text,
add column if not exists moderation_reason text;

alter table public.contributions
drop constraint if exists contributions_receipt_token_hash_format,
drop constraint if exists contributions_moderation_reason_length;

alter table public.contributions
add constraint contributions_receipt_token_hash_format
check (receipt_token_hash is null or receipt_token_hash ~ '^[0-9a-f]{64}$'),
add constraint contributions_moderation_reason_length
check (moderation_reason is null or length(moderation_reason) between 1 and 240);

create unique index if not exists contributions_receipt_token_hash_idx
on public.contributions (receipt_token_hash)
where receipt_token_hash is not null;

create or replace function public.sync_azulejo_review_metadata()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  archive_contribution_id uuid;
begin
  select id into archive_contribution_id
  from public.contributions
  where legacy_azulejo_id = new.id;

  update public.contributions
  set
    moderation_reason = new.moderation_reason,
    updated_at = now()
  where id = archive_contribution_id;

  update public.observations
  set condition_codes = new.condition_codes
  where legacy_azulejo_id = new.id;

  if old.moderation_status is distinct from new.moderation_status then
    update public.moderation_events
    set reason = new.moderation_reason
    where id = (
      select id
      from public.moderation_events
      where contribution_id = archive_contribution_id
        and next_status = new.moderation_status
      order by created_at desc
      limit 1
    );
  end if;

  return new;
end;
$$;

drop trigger if exists zzz_azulejos_sync_review_metadata on public.azulejos;
create trigger zzz_azulejos_sync_review_metadata
after update of moderation_status, moderation_reason, condition_codes on public.azulejos
for each row execute function public.sync_azulejo_review_metadata();

