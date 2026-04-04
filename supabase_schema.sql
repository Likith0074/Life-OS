-- Create Phase 1 Database Tables
create table if not exists public.daily_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  date date not null default current_date,
  diet_choice text default 'non-veg',
  completed_tasks jsonb default '[]',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.supplement_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  date date not null default current_date,
  supplement_name text not null,
  taken boolean default false,
  taken_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.daily_logs enable row level security;
alter table public.supplement_logs enable row level security;

-- Setup RLS Policies for daily_logs so that a user can only access their own data
create policy "Individuals can view their own daily logs"
on public.daily_logs for select using ( auth.uid() = user_id );

create policy "Individuals can insert their own daily logs"
on public.daily_logs for insert with check ( auth.uid() = user_id );

create policy "Individuals can update their own daily logs"
on public.daily_logs for update using ( auth.uid() = user_id );

-- Setup RLS Policies for supplement_logs
create policy "Individuals can view their own supplement logs"
on public.supplement_logs for select using ( auth.uid() = user_id );

create policy "Individuals can insert their own supplement logs"
on public.supplement_logs for insert with check ( auth.uid() = user_id );

create policy "Individuals can update their own supplement logs"
on public.supplement_logs for update using ( auth.uid() = user_id );
