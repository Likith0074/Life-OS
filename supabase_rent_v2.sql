-- Rent Collection Module V2 (Advanced)

-- 1. Create Properties Table
create table if not exists public.properties (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  property_type text not null default 'Standalone', -- 'Commercial', 'Standalone', 'Room'
  address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Tenants Table
create table if not exists public.tenants (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  property_id uuid references public.properties(id) on delete cascade not null,
  name text not null,
  base_rent numeric not null default 0,
  annual_increment_pct numeric not null default 0,
  advance_paid numeric not null default 0,
  move_in_date date not null default current_date,
  is_active boolean default true,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create Rent Logs Table
create table if not exists public.rent_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  month text not null, -- Format: YYYY-MM
  amount_expected numeric not null default 0, -- Rent factored with rollover balances
  amount_paid numeric not null default 0,    -- What they explicitly paid
  adjustments numeric not null default 0,    -- e.g., -500 for repairs, or +200 late fee
  status text not null default 'Pending',    -- Pending, Partial, Paid
  payment_dates jsonb default '[]'::jsonb,   -- Store multiple timestamps if paid in chunks
  proof_url text,                            -- Path to file in Supabase Storage
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(tenant_id, month)                   -- One log per tenant per month roughly, or we just rely on query
);

-- Enable RLS
alter table public.properties enable row level security;
alter table public.tenants enable row level security;
alter table public.rent_logs enable row level security;

-- Policies
create policy "Individuals can view their own properties" on public.properties for select using (auth.uid() = user_id);
create policy "Individuals can insert their own properties" on public.properties for insert with check (auth.uid() = user_id);
create policy "Individuals can update their own properties" on public.properties for update using (auth.uid() = user_id);
create policy "Individuals can delete their own properties" on public.properties for delete using (auth.uid() = user_id);

create policy "Individuals can view their own tenants" on public.tenants for select using (auth.uid() = user_id);
create policy "Individuals can insert their own tenants" on public.tenants for insert with check (auth.uid() = user_id);
create policy "Individuals can update their own tenants" on public.tenants for update using (auth.uid() = user_id);
create policy "Individuals can delete their own tenants" on public.tenants for delete using (auth.uid() = user_id);

create policy "Individuals can view their own rent logs" on public.rent_logs for select using (auth.uid() = user_id);
create policy "Individuals can insert their own rent logs" on public.rent_logs for insert with check (auth.uid() = user_id);
create policy "Individuals can update their own rent logs" on public.rent_logs for update using (auth.uid() = user_id);
create policy "Individuals can delete their own rent logs" on public.rent_logs for delete using (auth.uid() = user_id);
