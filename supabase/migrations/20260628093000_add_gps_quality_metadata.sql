alter table public.azulejos
add column if not exists gps_accuracy_m double precision,
add column if not exists gps_timestamp timestamptz,
add column if not exists location_source text not null default 'legacy';

alter table public.azulejos
drop constraint if exists azulejos_gps_accuracy_check;

alter table public.azulejos
add constraint azulejos_gps_accuracy_check
check (gps_accuracy_m is null or (gps_accuracy_m > 0 and gps_accuracy_m <= 10000));

alter table public.azulejos
drop constraint if exists azulejos_location_source_check;

alter table public.azulejos
add constraint azulejos_location_source_check
check (location_source in ('browser', 'exif', 'legacy'));
