-- Stage 2 Database Migration 
-- Create Tables
create table if not exists public.training_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  date date not null default current_date,
  session_type text not null,
  swim_m integer default 0,
  bike_km numeric default 0,
  run_km numeric default 0,
  duration_min integer default 0,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.body_stats (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  date date not null default current_date,
  weight_kg numeric not null,
  body_fat_pct numeric not null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.skincare_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  date date not null default current_date,
  step_name text not null,
  completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.share_links (
  token uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone,
  revoked boolean default false
);

-- Enable Row Level Security (RLS)
alter table public.training_logs enable row level security;
alter table public.body_stats enable row level security;
alter table public.skincare_logs enable row level security;
alter table public.share_links enable row level security;

-- Setup RLS Policies for training_logs
create policy "Individuals can view their own training logs" on public.training_logs for select using ( auth.uid() = user_id );
create policy "Individuals can insert their own training logs" on public.training_logs for insert with check ( auth.uid() = user_id );
create policy "Individuals can update their own training logs" on public.training_logs for update using ( auth.uid() = user_id );

-- Setup RLS Policies for body_stats
create policy "Individuals can view their own body stats" on public.body_stats for select using ( auth.uid() = user_id );
create policy "Individuals can insert their own body stats" on public.body_stats for insert with check ( auth.uid() = user_id );
create policy "Individuals can update their own body stats" on public.body_stats for update using ( auth.uid() = user_id );

-- Setup RLS Policies for skincare_logs
create policy "Individuals can view their own skincare logs" on public.skincare_logs for select using ( auth.uid() = user_id );
create policy "Individuals can insert their own skincare logs" on public.skincare_logs for insert with check ( auth.uid() = user_id );
create policy "Individuals can update their own skincare logs" on public.skincare_logs for update using ( auth.uid() = user_id );

-- Setup RLS Policies for share_links
create policy "Individuals can view their own share links" on public.share_links for select using ( auth.uid() = user_id );
create policy "Individuals can insert their own share links" on public.share_links for insert with check ( auth.uid() = user_id );
create policy "Individuals can update their own share links" on public.share_links for update using ( auth.uid() = user_id );

-- Public read access for active share_links (For Trainer View)
create policy "Public read valid share links" on public.share_links for select using ( revoked = false and (expires_at > now() or expires_at is null) );

-- We need a secure way to let the public view user stats IF they have a share link token.
-- Because RLS uses auth.uid(), standard public access will block the data.
-- Since this is complex depending on Supabase configurations, a simple trick for MVP:
-- Enable anonymous read on metrics if there's a valid share_link...
-- IN PRODUCTION you'd use an Edge Function, but for this MVP, RLS is good enough for authenticated use.
