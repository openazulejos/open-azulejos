alter table public.azulejos
add column if not exists dominant_color text,
add column if not exists color_metadata jsonb not null default '{}'::jsonb;

alter table public.azulejos
drop constraint if exists azulejos_dominant_color_check;

alter table public.azulejos
add constraint azulejos_dominant_color_check
check (
  dominant_color is null
  or dominant_color in ('blue', 'green', 'yellow', 'red', 'brown', 'black', 'white', 'grey', 'multicolor')
);
