create index if not exists azulejos_public_dominant_color_idx
on public.azulejos (dominant_color)
where moderation_status = 'approved'
  and source = 'web-camera'
  and title <> 'api test';

create index if not exists azulejos_public_neighborhood_idx
on public.azulejos (neighborhood)
where moderation_status = 'approved'
  and source = 'web-camera'
  and title <> 'api test';

create or replace function public.azulejo_filter_facets()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with public_rows as materialized (
    select
      coalesce(nullif(trim(lower(neighborhood)), ''), 'unknown') as neighborhood,
      coalesce(nullif(trim(lower(dominant_color)), ''), 'unknown') as color
    from public.azulejos
    where moderation_status = 'approved'
      and source = 'web-camera'
      and title <> 'api test'
  ), combinations as (
    select neighborhood, color, count(*)::integer as count
    from public_rows
    group by neighborhood, color
  )
  select jsonb_build_object(
    'totalCount', (select count(*) from public_rows),
    'combinations', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'neighborhood', neighborhood,
            'color', color,
            'count', count
          )
          order by neighborhood, color
        )
        from combinations
      ),
      '[]'::jsonb
    )
  );
$$;

revoke all on function public.azulejo_filter_facets() from public;
grant execute on function public.azulejo_filter_facets() to anon, authenticated;
