-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/qcgkjkqvtjzjggsehjrp/sql
-- AdAutonomy + accounts tables

-- -----------------------------------------------------------------------------
-- Accounts (your schema; created_at defaults to now() on signup)
-- Store hashed passwords only — never plain text in production
-- -----------------------------------------------------------------------------
create table if not exists public.accounts (
  user_id serial primary key,
  username varchar(50) unique not null,
  password varchar(50) not null,
  email varchar(255) unique not null,
  created_at timestamp not null default now(),
  last_login timestamp
);

-- -----------------------------------------------------------------------------
-- App tables
-- -----------------------------------------------------------------------------
create table if not exists public.campaigns (
  id text primary key,
  data jsonb not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_logs (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.social_posts (
  id text primary key,
  data jsonb not null,
  platform text not null,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.accounts enable row level security;
alter table public.campaigns enable row level security;
alter table public.agent_logs enable row level security;
alter table public.social_posts enable row level security;

-- accounts: signup via API only; no public read (passwords must not be exposed)
create policy "Allow insert accounts" on public.accounts for insert with check (true);
create policy "Allow update accounts" on public.accounts for update using (true);

create policy "Allow public read campaigns" on public.campaigns for select using (true);
create policy "Allow public insert campaigns" on public.campaigns for insert with check (true);
create policy "Allow public update campaigns" on public.campaigns for update using (true);

create policy "Allow public read agent_logs" on public.agent_logs for select using (true);
create policy "Allow public insert agent_logs" on public.agent_logs for insert with check (true);

create policy "Allow public read social_posts" on public.social_posts for select using (true);
create policy "Allow public insert social_posts" on public.social_posts for insert with check (true);

-- -----------------------------------------------------------------------------
-- Storage: public ad videos for social sharing (run once in SQL Editor)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('ad-videos', 'ad-videos', true)
on conflict (id) do update set public = true;

create policy "Public read ad videos"
on storage.objects for select
using (bucket_id = 'ad-videos');

create policy "Anyone can upload ad videos"
on storage.objects for insert
with check (bucket_id = 'ad-videos');
