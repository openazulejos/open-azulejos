create table if not exists public.site_analytics_daily (
  day date not null,
  event text not null,
  view text not null,
  source text not null,
  count bigint not null default 0 check (count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (day, event, view, source),
  constraint site_analytics_daily_event_check check (event in ('page_view')),
  constraint site_analytics_daily_view_check check (view in ('map', 'grid', 'canva')),
  constraint site_analytics_daily_source_check check (source in ('direct', 'internal', 'search', 'social', 'referral'))
);

alter table public.site_analytics_daily enable row level security;

revoke all on table public.site_analytics_daily from public, anon, authenticated;

create or replace function public.record_site_analytics(
  p_event text,
  p_view text,
  p_source text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  next_count bigint;
begin
  if p_event <> 'page_view'
    or p_view not in ('map', 'grid', 'canva')
    or p_source not in ('direct', 'internal', 'search', 'social', 'referral') then
    raise exception 'invalid analytics dimensions';
  end if;

  insert into public.site_analytics_daily (day, event, view, source, count)
  values ((now() at time zone 'Europe/Lisbon')::date, p_event, p_view, p_source, 1)
  on conflict (day, event, view, source)
  do update set
    count = public.site_analytics_daily.count + 1,
    updated_at = now()
  returning count into next_count;

  return next_count;
end;
$$;

revoke all on function public.record_site_analytics(text, text, text) from public, anon, authenticated;
grant execute on function public.record_site_analytics(text, text, text) to service_role;
