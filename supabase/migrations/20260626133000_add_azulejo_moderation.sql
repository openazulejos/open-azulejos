alter table public.azulejos
add column if not exists moderation_status text not null default 'approved';

alter table public.azulejos
drop constraint if exists azulejos_moderation_status_check;

alter table public.azulejos
add constraint azulejos_moderation_status_check
check (moderation_status in ('pending', 'approved', 'rejected'));

update public.azulejos
set moderation_status = 'approved'
where moderation_status is null;

create index if not exists azulejos_moderation_status_created_at_idx
on public.azulejos (moderation_status, created_at desc);

drop policy if exists "public can read azulejos" on public.azulejos;
create policy "public can read approved azulejos"
on public.azulejos
for select
to anon, authenticated
using (moderation_status = 'approved');

drop policy if exists "public can create azulejos" on public.azulejos;
create policy "public can create pending azulejos"
on public.azulejos
for insert
to anon, authenticated
with check (
  source = 'web-camera'
  and moderation_status = 'pending'
  and lat between -90 and 90
  and lng between -180 and 180
);
