create extension if not exists pgcrypto;

create table if not exists public.azulejos (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'recorded azulejo',
  lat double precision not null,
  lng double precision not null,
  image_path text not null,
  image_url text not null,
  cell_code text,
  words text,
  source text not null default 'web-camera',
  created_at timestamptz not null default now()
);

create index if not exists azulejos_created_at_idx on public.azulejos (created_at desc);
create index if not exists azulejos_lat_lng_idx on public.azulejos (lat, lng);

alter table public.azulejos enable row level security;

drop policy if exists "public can read azulejos" on public.azulejos;
create policy "public can read azulejos"
on public.azulejos
for select
to anon, authenticated
using (true);

drop policy if exists "public can create azulejos" on public.azulejos;
create policy "public can create azulejos"
on public.azulejos
for insert
to anon, authenticated
with check (
  source = 'web-camera'
  and lat between -90 and 90
  and lng between -180 and 180
);

insert into storage.buckets (id, name, public)
values ('azulejos', 'azulejos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "public can read azulejo images" on storage.objects;
create policy "public can read azulejo images"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'azulejos');

drop policy if exists "public can upload azulejo images" on storage.objects;
create policy "public can upload azulejo images"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'azulejos'
  and lower((storage.foldername(name))[1]) = 'captures'
);
