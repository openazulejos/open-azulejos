create or replace view public.public_contributor_stats as
select
  profile.user_id,
  profile.pseudonym,
  profile.created_at as joined_at,
  count(contribution.id) filter (where contribution.status = 'approved')::integer as approved_count,
  count(contribution.id) filter (where contribution.status = 'pending')::integer as pending_count,
  count(contribution.id)::integer as total_count,
  max(contribution.submitted_at) as last_contribution_at
from public.contributor_profiles profile
left join public.contributions contribution
  on contribution.contributor_id = profile.user_id
group by profile.user_id, profile.pseudonym, profile.created_at;

comment on view public.public_contributor_stats is
'Public pseudonymous contribution counters for the open azulejos community surface.';
