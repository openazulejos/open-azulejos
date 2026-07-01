insert into public.moderation_events (
  contribution_id,
  previous_status,
  next_status,
  actor_label,
  created_at
)
select
  contribution.id,
  null,
  contribution.status,
  'legacy-import',
  contribution.submitted_at
from public.contributions contribution
where not exists (
  select 1
  from public.moderation_events event
  where event.contribution_id = contribution.id
);
