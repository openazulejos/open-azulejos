create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'admin' check (role in ('owner', 'admin', 'moderator')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.admin_profiles enable row level security;

alter table public.azulejos
add column if not exists last_admin_actor_id uuid references auth.users(id) on delete set null,
add column if not exists last_admin_actor_label text;

create or replace function public.annotate_azulejo_moderation_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  archive_contribution_id uuid;
begin
  if old.moderation_status is not distinct from new.moderation_status then
    return new;
  end if;

  select id into archive_contribution_id
  from public.contributions
  where legacy_azulejo_id = new.id;

  update public.moderation_events
  set
    actor_id = new.last_admin_actor_id,
    actor_label = coalesce(new.last_admin_actor_label, actor_label)
  where id = (
    select id
    from public.moderation_events
    where contribution_id = archive_contribution_id
      and next_status = new.moderation_status
    order by created_at desc
    limit 1
  );
  return new;
end;
$$;

drop trigger if exists zz_azulejos_annotate_moderation on public.azulejos;
create trigger zz_azulejos_annotate_moderation
after update of moderation_status on public.azulejos
for each row execute function public.annotate_azulejo_moderation_event();

drop policy if exists "public can read approved azulejos" on public.azulejos;

alter function public.azulejos_viewport(
  double precision,
  double precision,
  double precision,
  double precision,
  integer,
  double precision
) security definer;

revoke all on public.admin_profiles from anon, authenticated;
grant execute on function public.azulejos_viewport(
  double precision,
  double precision,
  double precision,
  double precision,
  integer,
  double precision
) to anon, authenticated;
