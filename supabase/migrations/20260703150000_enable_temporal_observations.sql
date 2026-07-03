alter table public.physical_instances
add column if not exists canonical_instance_id uuid references public.physical_instances(id) on delete set null,
add column if not exists canonicalized_at timestamptz,
add column if not exists canonicalized_by uuid references auth.users(id) on delete set null;

alter table public.physical_instances
drop constraint if exists physical_instances_not_self_canonical;

alter table public.physical_instances
add constraint physical_instances_not_self_canonical
check (canonical_instance_id is null or canonical_instance_id <> id);

create index if not exists physical_instances_canonical_idx
on public.physical_instances (canonical_instance_id)
where canonical_instance_id is not null;

alter table public.observations
add column if not exists condition_codes text[] not null default '{}'::text[],
add column if not exists attached_at timestamptz,
add column if not exists attached_by uuid references auth.users(id) on delete set null;

alter table public.observations
drop constraint if exists observations_condition_codes_check;

alter table public.observations
add constraint observations_condition_codes_check
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

create index if not exists observations_instance_observed_idx
on public.observations (physical_instance_id, observed_at desc, submitted_at desc);

-- The compatibility record still owns the observation data, but an admin can
-- now attach that observation to another canonical instance. Later edits to
-- the legacy record must not silently undo that reviewed attachment.
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

create or replace function public.azulejo_observation_history(p_legacy_azulejo_id uuid)
returns table (
  legacy_azulejo_id uuid,
  physical_instance_id uuid,
  observed_at timestamptz,
  submitted_at timestamptz,
  condition_codes text[],
  condition_notes text,
  confidence text,
  image_url text,
  photographer_credit text,
  photo_license text,
  lat double precision,
  lng double precision,
  gps_accuracy_m double precision
)
language sql
stable
security definer
set search_path = ''
as $$
  with requested_instance as (
    select observation.physical_instance_id
    from public.observations observation
    join public.azulejos legacy on legacy.id = observation.legacy_azulejo_id
    where observation.legacy_azulejo_id = p_legacy_azulejo_id
      and legacy.source = 'web-camera'
      and legacy.moderation_status = 'approved'
    limit 1
  )
  select
    observation.legacy_azulejo_id,
    observation.physical_instance_id,
    observation.observed_at,
    observation.submitted_at,
    observation.condition_codes,
    observation.condition_notes,
    observation.confidence,
    legacy.image_url,
    legacy.photographer_credit,
    legacy.photo_license,
    legacy.lat,
    legacy.lng,
    legacy.gps_accuracy_m
  from requested_instance requested
  join public.observations observation
    on observation.physical_instance_id = requested.physical_instance_id
  join public.azulejos legacy
    on legacy.id = observation.legacy_azulejo_id
  where legacy.source = 'web-camera'
    and legacy.moderation_status = 'approved'
  order by coalesce(observation.observed_at, observation.submitted_at), observation.created_at;
$$;

revoke all on function public.azulejo_observation_history(uuid) from public;
grant execute on function public.azulejo_observation_history(uuid) to anon, authenticated, service_role;
