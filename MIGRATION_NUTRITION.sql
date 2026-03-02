-- ════════════════════════════════════════════════════════════════════
-- MIGRATION — Nutrition & Objectifs
-- À coller dans Supabase > SQL Editor et exécuter UNE SEULE FOIS
-- ════════════════════════════════════════════════════════════════════

-- Objectifs nutritionnels (fixés par le coach ou l'athlète)
create table public.nutrition_goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade unique,
  calories integer default 2500,
  proteins integer default 180,
  carbs    integer default 280,
  fats     integer default 80,
  water    integer default 2500,
  updated_at timestamptz default now()
);

-- Entrées nutritionnelles quotidiennes
create table public.nutrition_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  log_date date not null default current_date,
  meal_name text,
  calories integer default 0,
  proteins numeric(6,1) default 0,
  carbs    numeric(6,1) default 0,
  fats     numeric(6,1) default 0,
  water    integer default 0,
  created_at timestamptz default now()
);

-- RLS
alter table public.nutrition_goals enable row level security;
alter table public.nutrition_logs  enable row level security;

create policy "own_goals" on public.nutrition_goals
  for all using (auth.uid() = user_id);
create policy "coach_goals" on public.nutrition_goals
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
  );

create policy "own_logs" on public.nutrition_logs
  for all using (auth.uid() = user_id);
create policy "coach_logs" on public.nutrition_logs
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
  );
