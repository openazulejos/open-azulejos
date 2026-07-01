create schema if not exists extensions;
create extension if not exists postgis with schema extensions;

alter table public.azulejos
add column if not exists image_bucket text not null default 'azulejos',
add column if not exists original_image_bucket text,
add column if not exists location extensions.geography(point, 4326);

update public.azulejos
set
  image_bucket = coalesce(nullif(image_bucket, ''), 'azulejos'),
  original_image_bucket = case
    when original_image_path is not null then coalesce(nullif(original_image_bucket, ''), 'azulejos')
    else null
  end,
  location = extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography
where location is null
   or image_bucket is null
   or (original_image_path is not null and original_image_bucket is null);

create or replace function public.sync_azulejo_location()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.location := extensions.st_setsrid(extensions.st_makepoint(new.lng, new.lat), 4326)::extensions.geography;
  return new;
end;
$$;

drop trigger if exists azulejos_sync_location on public.azulejos;
create trigger azulejos_sync_location
before insert or update of lat, lng on public.azulejos
for each row execute function public.sync_azulejo_location();

create index if not exists azulejos_location_gist_idx
on public.azulejos using gist (location)
where moderation_status = 'approved' and source = 'web-camera';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'azulejos-originals',
  'azulejos-originals',
  false,
  26214400,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.patterns (
  id uuid primary key default gen_random_uuid(),
  preferred_label text,
  description text,
  period_label text,
  confidence text not null default 'unknown'
    check (confidence in ('documented', 'probable', 'community-suggested', 'unknown')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  legacy_azulejo_id uuid unique references public.azulejos(id) on delete set null,
  name text,
  address text,
  location extensions.geography(point, 4326) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sites_location_gist_idx on public.sites using gist (location);

create table if not exists public.physical_instances (
  id uuid primary key default gen_random_uuid(),
  legacy_azulejo_id uuid unique references public.azulejos(id) on delete set null,
  site_id uuid references public.sites(id) on delete set null,
  pattern_id uuid references public.patterns(id) on delete set null,
  status text not null default 'unverified'
    check (status in ('unverified', 'present', 'damaged', 'removed', 'unknown')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.observations (
  id uuid primary key default gen_random_uuid(),
  legacy_azulejo_id uuid unique references public.azulejos(id) on delete set null,
  physical_instance_id uuid not null references public.physical_instances(id) on delete cascade,
  observed_at timestamptz,
  submitted_at timestamptz not null default now(),
  location extensions.geography(point, 4326) not null,
  gps_accuracy_m double precision,
  location_source text,
  condition_notes text,
  confidence text not null default 'community-suggested'
    check (confidence in ('documented', 'probable', 'community-suggested', 'unknown')),
  created_at timestamptz not null default now()
);
create index if not exists observations_location_gist_idx on public.observations using gist (location);

create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  legacy_azulejo_id uuid unique references public.azulejos(id) on delete set null,
  observation_id uuid references public.observations(id) on delete set null,
  contributor_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists contributions_status_submitted_idx
on public.contributions (status, submitted_at desc);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.contributions(id) on delete cascade,
  role text not null check (role in ('original', 'published', 'thumbnail', 'derivative')),
  bucket text not null,
  object_path text not null,
  mime_type text,
  byte_size bigint,
  width integer,
  height integer,
  sha256 text,
  created_at timestamptz not null default now(),
  unique (bucket, object_path)
);

create table if not exists public.image_treatments (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.contributions(id) on delete cascade,
  source_media_asset_id uuid references public.media_assets(id) on delete set null,
  output_media_asset_id uuid references public.media_assets(id) on delete set null,
  crop_points jsonb,
  settings jsonb not null default '{}'::jsonb,
  algorithm_version text not null default 'legacy-v1',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.moderation_events (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.contributions(id) on delete cascade,
  previous_status text,
  next_status text not null check (next_status in ('pending', 'approved', 'rejected')),
  actor_id uuid references auth.users(id) on delete set null,
  actor_label text,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists moderation_events_contribution_created_idx
on public.moderation_events (contribution_id, created_at desc);

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  creator text,
  citation text,
  url text,
  created_at timestamptz not null default now()
);

create table if not exists public.assertions (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null,
  subject_id uuid not null,
  property text not null,
  value jsonb not null,
  source_id uuid references public.sources(id) on delete set null,
  confidence text not null default 'unknown'
    check (confidence in ('documented', 'probable', 'community-suggested', 'unknown')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.similarity_links (
  id uuid primary key default gen_random_uuid(),
  first_instance_id uuid not null references public.physical_instances(id) on delete cascade,
  second_instance_id uuid not null references public.physical_instances(id) on delete cascade,
  relation text not null check (relation in ('duplicate', 'same-pattern', 'variation', 'possibly-related')),
  score double precision check (score is null or (score >= 0 and score <= 1)),
  reviewed boolean not null default false,
  created_at timestamptz not null default now(),
  check (first_instance_id <> second_instance_id),
  unique (first_instance_id, second_instance_id, relation)
);

alter table public.patterns enable row level security;
alter table public.sites enable row level security;
alter table public.physical_instances enable row level security;
alter table public.observations enable row level security;
alter table public.contributions enable row level security;
alter table public.media_assets enable row level security;
alter table public.image_treatments enable row level security;
alter table public.moderation_events enable row level security;
alter table public.sources enable row level security;
alter table public.assertions enable row level security;
alter table public.similarity_links enable row level security;

create or replace function public.sync_legacy_azulejo_archive()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  archive_site_id uuid;
  archive_instance_id uuid;
  archive_observation_id uuid;
  archive_contribution_id uuid;
begin
  insert into public.sites (legacy_azulejo_id, name, location, created_at, updated_at)
  values (new.id, new.title, new.location, new.created_at, now())
  on conflict (legacy_azulejo_id) do update set
    name = excluded.name,
    location = excluded.location,
    updated_at = now()
  returning id into archive_site_id;

  insert into public.physical_instances (legacy_azulejo_id, site_id, created_at, updated_at)
  values (new.id, archive_site_id, new.created_at, now())
  on conflict (legacy_azulejo_id) do update set
    site_id = excluded.site_id,
    updated_at = now()
  returning id into archive_instance_id;

  insert into public.observations (
    legacy_azulejo_id,
    physical_instance_id,
    observed_at,
    submitted_at,
    location,
    gps_accuracy_m,
    location_source,
    created_at
  ) values (
    new.id,
    archive_instance_id,
    new.gps_timestamp,
    new.created_at,
    new.location,
    new.gps_accuracy_m,
    new.location_source,
    new.created_at
  )
  on conflict (legacy_azulejo_id) do update set
    physical_instance_id = excluded.physical_instance_id,
    observed_at = excluded.observed_at,
    location = excluded.location,
    gps_accuracy_m = excluded.gps_accuracy_m,
    location_source = excluded.location_source
  returning id into archive_observation_id;

  insert into public.contributions (
    legacy_azulejo_id,
    observation_id,
    status,
    submitted_at,
    updated_at
  ) values (
    new.id,
    archive_observation_id,
    new.moderation_status,
    new.created_at,
    now()
  )
  on conflict (legacy_azulejo_id) do update set
    observation_id = excluded.observation_id,
    status = excluded.status,
    updated_at = now()
  returning id into archive_contribution_id;

  insert into public.media_assets (contribution_id, role, bucket, object_path, created_at)
  values (archive_contribution_id, 'published', coalesce(new.image_bucket, 'azulejos'), new.image_path, new.created_at)
  on conflict (bucket, object_path) do update set
    contribution_id = excluded.contribution_id,
    role = excluded.role;

  if new.original_image_path is not null then
    insert into public.media_assets (contribution_id, role, bucket, object_path, created_at)
    values (
      archive_contribution_id,
      'original',
      coalesce(new.original_image_bucket, 'azulejos'),
      new.original_image_path,
      new.created_at
    )
    on conflict (bucket, object_path) do update set
      contribution_id = excluded.contribution_id,
      role = excluded.role;
  end if;

  if tg_op = 'INSERT' or old.moderation_status is distinct from new.moderation_status then
    insert into public.moderation_events (
      contribution_id,
      previous_status,
      next_status,
      actor_label,
      created_at
    ) values (
      archive_contribution_id,
      case when tg_op = 'UPDATE' then old.moderation_status else null end,
      new.moderation_status,
      case when tg_op = 'INSERT' then 'submission' else 'legacy-admin' end,
      now()
    );
  end if;

  return new;
end;
$$;

drop trigger if exists azulejos_sync_archive on public.azulejos;
create trigger azulejos_sync_archive
after insert or update of title, lat, lng, image_path, image_bucket, original_image_path,
  original_image_bucket, moderation_status, gps_accuracy_m, gps_timestamp, location_source
on public.azulejos
for each row execute function public.sync_legacy_azulejo_archive();

-- Fire the compatibility trigger once for every existing record. This keeps the
-- legacy table authoritative during the transition without rewriting values.
update public.azulejos set title = title;
