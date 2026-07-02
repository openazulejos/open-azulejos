alter table public.azulejos
add column if not exists photographer_credit text,
add column if not exists photo_license text,
add column if not exists contributor_consent_at timestamptz;

alter table public.azulejos
drop constraint if exists azulejos_photo_rights_complete,
add constraint azulejos_photo_rights_complete check (
  (photographer_credit is null and photo_license is null and contributor_consent_at is null)
  or (
    length(trim(photographer_credit)) between 1 and 120
    and photo_license = 'CC-BY-4.0'
    and contributor_consent_at is not null
  )
);

alter table public.contributions
add column if not exists photographer_credit text,
add column if not exists photo_license text,
add column if not exists contributor_consent_at timestamptz;

alter table public.contributions
drop constraint if exists contributions_photo_rights_complete,
add constraint contributions_photo_rights_complete check (
  (photographer_credit is null and photo_license is null and contributor_consent_at is null)
  or (
    length(trim(photographer_credit)) between 1 and 120
    and photo_license = 'CC-BY-4.0'
    and contributor_consent_at is not null
  )
);

create or replace function public.sync_azulejo_contribution_rights()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.contributions
  set
    photographer_credit = new.photographer_credit,
    photo_license = new.photo_license,
    contributor_consent_at = new.contributor_consent_at,
    updated_at = now()
  where legacy_azulejo_id = new.id;
  return new;
end;
$$;

drop trigger if exists azulejos_sync_contribution_rights on public.azulejos;
create trigger azulejos_sync_contribution_rights
after insert or update of photographer_credit, photo_license, contributor_consent_at
on public.azulejos
for each row execute function public.sync_azulejo_contribution_rights();

comment on column public.azulejos.photo_license is
  'License for the photograph only; does not describe rights in the depicted tile or artwork.';
comment on column public.azulejos.contributor_consent_at is
  'Timestamp at which the contributor explicitly accepted the recorded photo license.';

