alter table public.azulejos
add column if not exists original_image_path text,
add column if not exists original_image_url text,
add column if not exists crop_points jsonb,
add column if not exists edit_settings jsonb not null default '{}'::jsonb,
add column if not exists edited_at timestamptz;

alter table public.azulejos
drop constraint if exists azulejos_crop_points_array_check;

alter table public.azulejos
add constraint azulejos_crop_points_array_check
check (crop_points is null or jsonb_typeof(crop_points) = 'array');
