-- VibeLeague pulse: pregunta del día, eventos, avisos, temporadas y dúos.
-- Ejecutar después de schema.sql.

alter table public.predictions drop constraint if exists predictions_mode_check;
alter table public.predictions
  add constraint predictions_mode_check
  check (mode in ('quick', 'duel', 'league', 'party', 'daily', 'duo', 'likely'));

alter table public.predictions
  add column if not exists confidence smallint check (confidence between 0 and 3);

create table if not exists public.answer_revisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  question_id text not null references public.questions (id),
  from_choice smallint not null check (from_choice in (0, 1)),
  to_choice smallint not null check (to_choice in (0, 1)),
  created_at timestamptz not null default now()
);

create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null,
  body text not null,
  href text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.season_archives (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  season_name text not null,
  winner_id uuid references public.profiles (id),
  podium jsonb not null default '[]'::jsonb,
  mvps jsonb not null default '[]'::jsonb,
  closed_at timestamptz not null default now()
);

create table if not exists public.event_scores (
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_id text not null,
  points integer not null default 0,
  played boolean not null default false,
  primary key (user_id, event_id)
);

create table if not exists public.duos (
  user_id uuid not null references public.profiles (id) on delete cascade,
  partner_id uuid not null references public.profiles (id) on delete cascade,
  points integer not null default 0,
  wins integer not null default 0,
  primary key (user_id, partner_id)
);

alter table public.answer_revisions enable row level security;
alter table public.notices enable row level security;
alter table public.season_archives enable row level security;
alter table public.event_scores enable row level security;
alter table public.duos enable row level security;

create policy "own revisions" on public.answer_revisions
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own notices" on public.notices
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "league seasons" on public.season_archives
  for select using (
    exists (
      select 1 from public.league_members
      where league_members.league_id = season_archives.league_id
        and league_members.user_id = (select auth.uid())
    )
  );
create policy "own event scores" on public.event_scores
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own duos" on public.duos
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
