alter table public.azulejos
add column if not exists image_fingerprint text
check (image_fingerprint is null or image_fingerprint ~ '^[01]{64}$');

alter table public.media_assets
add column if not exists perceptual_hash text
check (perceptual_hash is null or perceptual_hash ~ '^[01]{64}$');

alter table public.similarity_links
add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
add column if not exists reviewed_at timestamptz;

create or replace function public.sync_azulejo_image_fingerprint()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.media_assets media
  set perceptual_hash = new.image_fingerprint
  from public.contributions contribution
  where contribution.legacy_azulejo_id = new.id
    and media.contribution_id = contribution.id
    and media.role = 'published';
  return new;
end;
$$;

drop trigger if exists azulejos_sync_image_fingerprint on public.azulejos;
create trigger azulejos_sync_image_fingerprint
after insert or update of image_fingerprint on public.azulejos
for each row execute function public.sync_azulejo_image_fingerprint();

