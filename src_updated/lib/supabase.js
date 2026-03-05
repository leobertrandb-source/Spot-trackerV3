import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
)

/* ── SQL À COLLER DANS SUPABASE > SQL EDITOR ──────────────────────────────────

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  role text default 'athlete',
  created_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'athlete'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table public.sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  date date not null,
  seance_type text not null,
  notes text,
  created_at timestamptz default now()
);

create table public.sets (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.sessions(id) on delete cascade,
  exercise text not null,
  reps integer,
  weight numeric(6,2),
  rpe numeric(3,1),
  set_order integer default 0
);

alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.sets enable row level security;

create policy "own_profile" on public.profiles for all using (auth.uid() = id);
create policy "coach_profiles" on public.profiles for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'coach'));

create policy "own_sessions" on public.sessions for all using (auth.uid() = user_id);
create policy "coach_sessions" on public.sessions for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'coach'));

create policy "own_sets" on public.sets for all using (
  exists (select 1 from public.sessions where id = session_id and user_id = auth.uid()));
create policy "coach_sets" on public.sets for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'coach'));

────────────────────────────────────────────────────────────────────────────── */
