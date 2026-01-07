create table characters (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique, -- Changed from uuid references auth.users to text, added unique
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- alter table characters enable row level security;
-- For prototype, disable RLS to allow 'dummy-user' access without auth token
alter table characters disable row level security; 

-- Policies commented out
/*
create policy "Users can view their own characters"
  on characters for select
  using (auth.uid() = user_id);

create policy "Users can update their own characters"
  on characters for update
  using (auth.uid() = user_id);

create policy "Users can insert their own characters"
  on characters for insert
  with check (auth.uid() = user_id);
*/
