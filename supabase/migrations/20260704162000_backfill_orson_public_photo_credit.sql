do $$
declare
  target_contributor uuid;
  target_credit text;
begin
  select user_id, pseudonym
  into target_contributor, target_credit
  from public.contributor_profiles
  where normalized_pseudonym = 'orson'
  order by created_at asc
  limit 1;

  if target_contributor is null then
    return;
  end if;

  update public.azulejos azulejo
  set
    photographer_credit = target_credit,
    photo_license = coalesce(azulejo.photo_license, 'CC-BY-4.0'),
    contributor_consent_at = coalesce(azulejo.contributor_consent_at, azulejo.created_at, now())
  from public.contributions contribution
  where contribution.legacy_azulejo_id = azulejo.id
    and contribution.contributor_id = target_contributor
    and (
      azulejo.photographer_credit is null
      or trim(azulejo.photographer_credit) = ''
      or lower(trim(azulejo.photographer_credit)) = 'anonymous'
    );

  update public.contributions contribution
  set
    photographer_credit = target_credit,
    photo_license = coalesce(contribution.photo_license, 'CC-BY-4.0'),
    contributor_consent_at = coalesce(contribution.contributor_consent_at, contribution.submitted_at, now())
  where contribution.contributor_id = target_contributor
    and (
      contribution.photographer_credit is null
      or trim(contribution.photographer_credit) = ''
      or lower(trim(contribution.photographer_credit)) = 'anonymous'
    );
end $$;
