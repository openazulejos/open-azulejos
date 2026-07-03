do $$
declare
  target_contributor uuid;
begin
  select user_id
  into target_contributor
  from public.contributor_profiles
  order by
    case
      when normalized_pseudonym = 'orson' then 0
      when normalized_pseudonym like 'orson%' then 1
      else 2
    end,
    created_at asc
  limit 1;

  if target_contributor is null then
    return;
  end if;

  with latest_approved as (
    select id
    from public.contributions
    where status = 'approved'
    order by submitted_at desc nulls last
    limit 10
  ),
  legacy_public_photos as (
    select contribution.id
    from public.contributions contribution
    join public.azulejos legacy
      on legacy.id = contribution.legacy_azulejo_id
    where contribution.status = 'approved'
      and contribution.contributor_id is null
      and legacy.source = 'web-camera'
      and not exists (
        select 1
        from latest_approved latest
        where latest.id = contribution.id
      )
  )
  update public.contributions contribution
  set contributor_id = target_contributor
  from legacy_public_photos legacy
  where contribution.id = legacy.id;
end $$;
