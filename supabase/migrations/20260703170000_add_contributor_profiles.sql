create table if not exists public.contributor_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pseudonym text not null,
  normalized_pseudonym text not null,
  public_profile boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contributor_profiles_pseudonym_length check (length(pseudonym) between 2 and 32),
  constraint contributor_profiles_normalized_pseudonym_length check (length(normalized_pseudonym) between 2 and 32)
);

create unique index if not exists contributor_profiles_normalized_pseudonym_idx
on public.contributor_profiles (normalized_pseudonym);

alter table public.contributor_profiles enable row level security;

create index if not exists contributions_contributor_submitted_idx
on public.contributions (contributor_id, submitted_at desc)
where contributor_id is not null;

comment on table public.contributor_profiles is
  'Minimal contributor identities. Contributions remain publishable independently of public profiles.';
