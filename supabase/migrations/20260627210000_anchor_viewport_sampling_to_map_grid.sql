drop function if exists public.azulejos_viewport(
  double precision,
  double precision,
  double precision,
  double precision,
  integer
);

create or replace function public.azulejos_viewport(
  p_south double precision,
  p_west double precision,
  p_north double precision,
  p_east double precision,
  p_limit integer default 600,
  p_step_meters double precision default 384
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with parameters as (
    select
      greatest(1, least(coalesce(p_limit, 600), 1200)) as item_limit,
      greatest(3.0, least(coalesce(p_step_meters, 384), 100000.0)) as step_meters
  ),
  visible as (
    select
      a.id,
      a.title,
      a.lat,
      a.lng,
      a.image_url,
      a.cell_code,
      a.words,
      a.source,
      a.created_at,
      floor((radians(a.lng) * 6378137.0) / parameters.step_meters)::bigint as grid_x,
      floor((6378137.0 * ln(tan(pi() / 4.0 + radians(a.lat) / 2.0))) / parameters.step_meters)::bigint as grid_y
    from public.azulejos a
    cross join parameters
    where a.moderation_status = 'approved'
      and a.source = 'web-camera'
      and a.title <> 'api test'
      and a.lat between p_south and p_north
      and a.lng between p_west and p_east
  ),
  ranked as (
    select
      visible.*,
      row_number() over (partition by grid_x, grid_y order by created_at desc, id) as grid_rank
    from visible
  ),
  selected as (
    select id, title, lat, lng, image_url, cell_code, words, source, created_at
    from ranked
    where grid_rank = 1
    order by created_at desc
    limit (select item_limit from parameters)
  )
  select jsonb_build_object(
    'records', coalesce((select jsonb_agg(to_jsonb(selected)) from selected), '[]'::jsonb),
    'visibleCount', (select count(*) from visible),
    'totalCount', (
      select count(*)
      from public.azulejos
      where moderation_status = 'approved'
        and source = 'web-camera'
        and title <> 'api test'
    )
  );
$$;

grant execute on function public.azulejos_viewport(
  double precision,
  double precision,
  double precision,
  double precision,
  integer,
  double precision
) to anon, authenticated;
