-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION MEDICAL — Tables et RLS policies pour le module médical prépa physique
-- Coller dans Supabase > SQL Editor et exécuter
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Table coach_clients (si pas déjà créée) ────────────────────────────────
create table if not exists public.coach_clients (
  id         uuid default gen_random_uuid() primary key,
  coach_id   uuid references public.profiles(id) on delete cascade,
  client_id  uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(coach_id, client_id)
);

alter table public.coach_clients enable row level security;

-- Supprime les anciennes policies pour repartir proprement
drop policy if exists "coach_access_clients"          on public.coach_clients;
drop policy if exists "athlete_see_coach"             on public.coach_clients;
drop policy if exists "staff_medical_clients"         on public.coach_clients;

-- Le coach gère ses propres clients
create policy "coach_access_clients" on public.coach_clients
  for all using (auth.uid() = coach_id);

-- L'athlète peut voir sa relation avec son coach
create policy "athlete_see_coach" on public.coach_clients
  for select using (auth.uid() = client_id);

-- Le staff médical peut lire les clients du coach auquel il est rattaché
create policy "staff_medical_clients" on public.coach_clients
  for select using (
    exists (
      select 1 from public.club_staff
      where staff_id = auth.uid() and coach_id = coach_clients.coach_id
    )
  );


-- ─── 2. Table club_staff (si pas déjà créée) ──────────────────────────────────
create table if not exists public.club_staff (
  id         uuid default gen_random_uuid() primary key,
  coach_id   uuid references public.profiles(id) on delete cascade,
  staff_id   uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(coach_id, staff_id)
);

alter table public.club_staff enable row level security;

drop policy if exists "coach_manage_staff"  on public.club_staff;
drop policy if exists "staff_see_own_link"  on public.club_staff;

-- Le coach gère son staff
create policy "coach_manage_staff" on public.club_staff
  for all using (auth.uid() = coach_id);

-- Le staff peut voir sa propre entrée
create policy "staff_see_own_link" on public.club_staff
  for select using (auth.uid() = staff_id);


-- ─── 3. Table medical_injuries ────────────────────────────────────────────────
create table if not exists public.medical_injuries (
  id           uuid default gen_random_uuid() primary key,
  athlete_id   uuid references public.profiles(id) on delete cascade,
  body_zone    text not null,
  description  text,
  date_injury  date not null,
  date_return  date,
  status       text not null default 'active', -- 'active' | 'surveillance' | 'archive'
  match_id     uuid,
  created_at   timestamptz default now()
);

alter table public.medical_injuries enable row level security;

drop policy if exists "athlete_own_injuries"  on public.medical_injuries;
drop policy if exists "coach_injuries"        on public.medical_injuries;
drop policy if exists "staff_medical_injuries" on public.medical_injuries;

-- L'athlète gère ses propres blessures
create policy "athlete_own_injuries" on public.medical_injuries
  for all using (auth.uid() = athlete_id);

-- Le coach peut tout faire sur les blessures de ses athlètes
create policy "coach_injuries" on public.medical_injuries
  for all using (
    exists (
      select 1 from public.coach_clients
      where coach_id = auth.uid() and client_id = medical_injuries.athlete_id
    )
  );

-- Le staff médical peut tout faire sur les blessures des athlètes de son coach
create policy "staff_medical_injuries" on public.medical_injuries
  for all using (
    exists (
      select 1 from public.club_staff cs
      join public.coach_clients cc on cc.coach_id = cs.coach_id
      where cs.staff_id = auth.uid() and cc.client_id = medical_injuries.athlete_id
    )
  );


-- ─── 4. Table medical_appointments ───────────────────────────────────────────
create table if not exists public.medical_appointments (
  id                uuid default gen_random_uuid() primary key,
  athlete_id        uuid references public.profiles(id) on delete cascade,
  injury_id         uuid references public.medical_injuries(id) on delete set null,
  type              text not null default 'kine',
  date_appointment  date not null,
  location          text,
  notes             text,
  created_at        timestamptz default now()
);

alter table public.medical_appointments enable row level security;

drop policy if exists "athlete_own_appts"         on public.medical_appointments;
drop policy if exists "coach_appts"               on public.medical_appointments;
drop policy if exists "staff_medical_appts"       on public.medical_appointments;

create policy "athlete_own_appts" on public.medical_appointments
  for all using (auth.uid() = athlete_id);

create policy "coach_appts" on public.medical_appointments
  for all using (
    exists (
      select 1 from public.coach_clients
      where coach_id = auth.uid() and client_id = medical_appointments.athlete_id
    )
  );

create policy "staff_medical_appts" on public.medical_appointments
  for all using (
    exists (
      select 1 from public.club_staff cs
      join public.coach_clients cc on cc.coach_id = cs.coach_id
      where cs.staff_id = auth.uid() and cc.client_id = medical_appointments.athlete_id
    )
  );


-- ─── 5. Table medical_notes ──────────────────────────────────────────────────
create table if not exists public.medical_notes (
  id          uuid default gen_random_uuid() primary key,
  athlete_id  uuid references public.profiles(id) on delete cascade,
  injury_id   uuid references public.medical_injuries(id) on delete set null,
  content     text not null,
  is_pinned   boolean default false,
  created_at  timestamptz default now()
);

alter table public.medical_notes enable row level security;

drop policy if exists "athlete_own_notes"     on public.medical_notes;
drop policy if exists "coach_notes"           on public.medical_notes;
drop policy if exists "staff_medical_notes"   on public.medical_notes;

create policy "athlete_own_notes" on public.medical_notes
  for all using (auth.uid() = athlete_id);

create policy "coach_notes" on public.medical_notes
  for all using (
    exists (
      select 1 from public.coach_clients
      where coach_id = auth.uid() and client_id = medical_notes.athlete_id
    )
  );

create policy "staff_medical_notes" on public.medical_notes
  for all using (
    exists (
      select 1 from public.club_staff cs
      join public.coach_clients cc on cc.coach_id = cs.coach_id
      where cs.staff_id = auth.uid() and cc.client_id = medical_notes.athlete_id
    )
  );


-- ─── 6. Table match_history ──────────────────────────────────────────────────
create table if not exists public.match_history (
  id          uuid default gen_random_uuid() primary key,
  coach_id    uuid references public.profiles(id) on delete cascade,
  label       text not null,
  match_date  date not null,
  opponent    text,
  created_at  timestamptz default now()
);

alter table public.match_history enable row level security;

drop policy if exists "coach_own_matches"        on public.match_history;
drop policy if exists "staff_medical_matches"    on public.match_history;

create policy "coach_own_matches" on public.match_history
  for all using (auth.uid() = coach_id);

create policy "staff_medical_matches" on public.match_history
  for select using (
    exists (
      select 1 from public.club_staff
      where staff_id = auth.uid() and coach_id = match_history.coach_id
    )
  );


-- ─── 7. Table match_injuries ─────────────────────────────────────────────────
create table if not exists public.match_injuries (
  id          uuid default gen_random_uuid() primary key,
  match_id    uuid references public.match_history(id) on delete cascade,
  athlete_id  uuid references public.profiles(id) on delete cascade,
  body_zone   text,
  description text,
  created_at  timestamptz default now()
);

alter table public.match_injuries enable row level security;

drop policy if exists "coach_match_injuries"       on public.match_injuries;
drop policy if exists "staff_medical_match_injuries" on public.match_injuries;

create policy "coach_match_injuries" on public.match_injuries
  for all using (
    exists (
      select 1 from public.match_history
      where id = match_injuries.match_id and coach_id = auth.uid()
    )
  );

create policy "staff_medical_match_injuries" on public.match_injuries
  for all using (
    exists (
      select 1 from public.match_history mh
      join public.club_staff cs on cs.coach_id = mh.coach_id
      where mh.id = match_injuries.match_id and cs.staff_id = auth.uid()
    )
  );


-- ─── 8. Accès profiles — le staff médical peut lire les profils des athlètes ──
-- (La policy "coach_profiles" existante couvre les coaches, on ajoute staff_medical)
drop policy if exists "staff_medical_profiles" on public.profiles;

create policy "staff_medical_profiles" on public.profiles
  for select using (
    exists (
      select 1 from public.club_staff cs
      join public.coach_clients cc on cc.coach_id = cs.coach_id
      where cs.staff_id = auth.uid() and cc.client_id = profiles.id
    )
  );
