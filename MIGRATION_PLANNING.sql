-- ══════════════════════════════════════════════════════════════════
-- MIGRATION — Planning coach & Programmes multi-semaines
-- À exécuter dans Supabase > SQL Editor
-- ══════════════════════════════════════════════════════════════════

-- ─── 0. Tables program_days + program_day_exercises (builder) ────
create table if not exists public.program_days (
  id           uuid default gen_random_uuid() primary key,
  program_id   uuid references public.programs(id) on delete cascade,
  week_number  integer not null default 1,
  day_of_week  integer not null,
  name         text,
  created_at   timestamptz default now()
);

create table if not exists public.program_day_exercises (
  id            uuid default gen_random_uuid() primary key,
  day_id        uuid references public.program_days(id) on delete cascade,
  exercise_id   uuid,
  exercise_name text not null,
  sets          integer default 3,
  reps          text default '8-12',
  rpe_target    numeric(3,1),
  rest_seconds  integer default 90,
  notes         text,
  position      integer default 0,
  created_at    timestamptz default now()
);

alter table public.program_days enable row level security;
alter table public.program_day_exercises enable row level security;

drop policy if exists "coach_program_days" on public.program_days;
drop policy if exists "athlete_read_days"  on public.program_days;
drop policy if exists "coach_day_exercises" on public.program_day_exercises;
drop policy if exists "athlete_read_day_exercises" on public.program_day_exercises;

create policy "coach_program_days" on public.program_days
  for all using (
    exists (select 1 from public.programs p where p.id = program_days.program_id and p.coach_id = auth.uid())
  );
create policy "athlete_read_days" on public.program_days
  for select using (
    exists (select 1 from public.programs p join public.assignments a on a.program_id = p.id where p.id = program_days.program_id and a.athlete_id = auth.uid())
  );
create policy "coach_day_exercises" on public.program_day_exercises
  for all using (
    exists (select 1 from public.program_days d join public.programs p on p.id = d.program_id where d.id = program_day_exercises.day_id and p.coach_id = auth.uid())
  );
create policy "athlete_read_day_exercises" on public.program_day_exercises
  for select using (
    exists (select 1 from public.program_days d join public.programs p on p.id = d.program_id join public.assignments a on a.program_id = p.id where d.id = program_day_exercises.day_id and a.athlete_id = auth.uid())
  );

-- ─── 1. Ajouter colonnes manquantes sur programs ──────────────────
alter table public.programs
  add column if not exists description text,
  add column if not exists weeks_count  integer default 1,
  add column if not exists is_template  boolean default true,
  add column if not exists color        text    default '#3ecf8e';

-- ─── 2. Table sessions (séances d'un programme) ───────────────────
-- Une séance = un jour précis dans la semaine X du programme
create table if not exists public.program_sessions (
  id           uuid default gen_random_uuid() primary key,
  program_id   uuid references public.programs(id) on delete cascade,
  week_number  integer not null default 1,  -- semaine 1, 2, 3...
  day_of_week  integer not null,            -- 1=Lun, 2=Mar, ..., 7=Dim
  label        text,                        -- ex: "Haut du corps", "Force"
  created_at   timestamptz default now()
);

alter table public.program_sessions enable row level security;

drop policy if exists "coach_own_sessions"   on public.program_sessions;
drop policy if exists "athlete_read_sessions" on public.program_sessions;

create policy "coach_own_sessions" on public.program_sessions
  for all using (
    exists (
      select 1 from public.programs p
      where p.id = program_sessions.program_id and p.coach_id = auth.uid()
    )
  );

create policy "athlete_read_sessions" on public.program_sessions
  for select using (
    exists (
      select 1 from public.programs p
      join public.assignments a on a.program_id = p.id
      where p.id = program_sessions.program_id and a.athlete_id = auth.uid()
    )
  );

-- ─── 3. Relier program_exercises à une session ────────────────────
alter table public.program_exercises
  add column if not exists session_id    uuid references public.program_sessions(id) on delete cascade,
  add column if not exists week_number   integer default 1,
  add column if not exists day_of_week   integer default 1,
  add column if not exists notes         text,
  add column if not exists rest_seconds  integer;

-- ─── 4. Table coach_planning (assignations hebdo visuelles) ───────
-- Permet au coach de planifier n'importe quelle séance sur n'importe quel jour
create table if not exists public.coach_planning (
  id           uuid default gen_random_uuid() primary key,
  coach_id     uuid references public.profiles(id) on delete cascade,
  athlete_id   uuid references public.profiles(id) on delete cascade,
  session_id   uuid references public.program_sessions(id) on delete set null,
  program_id   uuid references public.programs(id) on delete set null,
  planned_date date not null,
  label        text,
  notes        text,
  status       text default 'planned',  -- 'planned' | 'done' | 'missed'
  created_at   timestamptz default now()
);

alter table public.coach_planning enable row level security;

drop policy if exists "coach_own_planning"   on public.coach_planning;
drop policy if exists "athlete_read_planning" on public.coach_planning;

create policy "coach_own_planning" on public.coach_planning
  for all using (auth.uid() = coach_id);

create policy "athlete_read_planning" on public.coach_planning
  for select using (auth.uid() = athlete_id);
