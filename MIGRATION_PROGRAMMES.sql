-- ════════════════════════════════════════════════════════════════════
-- MIGRATION — Programmes & Assignations
-- À coller dans Supabase > SQL Editor et exécuter UNE SEULE FOIS
-- Ne touche pas aux tables existantes
-- ════════════════════════════════════════════════════════════════════

-- Table programmes (créés par le coach)
create table public.programs (
  id uuid default gen_random_uuid() primary key,
  coach_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  seance_type text not null,
  created_at timestamptz default now()
);

-- Table exercices d'un programme
create table public.program_exercises (
  id uuid default gen_random_uuid() primary key,
  program_id uuid references public.programs(id) on delete cascade,
  exercise text not null,
  sets_target integer,
  reps_target text,      -- ex: "8-10" ou "12"
  rpe_target numeric(3,1),
  exercise_order integer default 0
);

-- Table assignations (coach → athlète → date)
create table public.assignments (
  id uuid default gen_random_uuid() primary key,
  program_id uuid references public.programs(id) on delete cascade,
  athlete_id uuid references public.profiles(id) on delete cascade,
  assigned_date date not null,
  note text,
  created_at timestamptz default now()
);

-- RLS
alter table public.programs enable row level security;
alter table public.program_exercises enable row level security;
alter table public.assignments enable row level security;

-- Programmes : coach gère les siens
create policy "coach_own_programs" on public.programs
  for all using (auth.uid() = coach_id);

create policy "athlete_read_programs" on public.programs
  for select using (
    exists (
      select 1 from public.assignments
      where program_id = programs.id and athlete_id = auth.uid()
    )
  );

-- Exercices du programme : accessible si accès au programme
create policy "program_exercises_access" on public.program_exercises
  for select using (
    exists (
      select 1 from public.programs p
      left join public.assignments a on a.program_id = p.id
      where p.id = program_exercises.program_id
        and (p.coach_id = auth.uid() or a.athlete_id = auth.uid())
    )
  );

create policy "coach_manage_exercises" on public.program_exercises
  for all using (
    exists (
      select 1 from public.programs
      where id = program_exercises.program_id and coach_id = auth.uid()
    )
  );

-- Assignations : coach gère, athlète lit les siennes
create policy "coach_manage_assignments" on public.assignments
  for all using (
    exists (
      select 1 from public.programs
      where id = assignments.program_id and coach_id = auth.uid()
    )
  );

create policy "athlete_read_assignments" on public.assignments
  for select using (auth.uid() = athlete_id);
