alter table public.contributor_profiles
add column if not exists is_test_account boolean not null default false;

update public.contributor_profiles
set is_test_account = true,
    updated_at = now()
where normalized_pseudonym = 'android qa';

create or replace view public.public_contributor_stats
with (security_invoker = true) as
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
where not profile.is_test_account
group by profile.user_id, profile.pseudonym, profile.created_at;

comment on column public.contributor_profiles.is_test_account is
  'Marks technical QA identities that must not appear in public community rankings.';

comment on view public.public_contributor_stats is
  'Public pseudonymous contribution counters excluding technical test accounts.';
