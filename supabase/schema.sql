-- VibeLeague schema. Run in the Supabase SQL editor.
-- Real answers stay private. Guesses are scored inside private functions.

create schema if not exists private;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  display_name text not null,
  avatar_emoji text not null default '✨',
  friend_code text unique not null,
  xp integer not null default 0,
  onboarded boolean not null default false,
  privacy jsonb not null default jsonb_build_object(
    'visibility', 'friends',
    'invites', 'friends',
    'challenges', 'friends',
    'answers', 'only_in_games',
    'allowAi', true,
    'saveParty', true
  ),
  created_at timestamptz not null default now()
);

create table public.questions (
  id text primary key,
  category text not null,
  emoji text not null,
  prompt text not null,
  option_a text not null,
  option_b text not null,
  leans jsonb not null default '{}'::jsonb
);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  question_id text not null references public.questions (id),
  choice smallint not null check (choice in (0, 1)),
  source text not null check (source in ('onboarding', 'self', 'party')),
  created_at timestamptz not null default now(),
  unique (user_id, question_id)
);

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique not null,
  season_name text not null default 'Temporada 1',
  owner_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.league_members (
  league_id uuid not null references public.leagues (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  weekly integer not null default 0,
  season integer not null default 0,
  historic integer not null default 0,
  primary key (league_id, user_id)
);

create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  predictor_id uuid not null references public.profiles (id) on delete cascade,
  target_id uuid not null references public.profiles (id) on delete cascade,
  question_id text not null references public.questions (id),
  choice smallint not null check (choice in (0, 1)),
  answer_type text not null check (answer_type in ('real_answer', 'ai_prediction')),
  correct boolean not null,
  mode text not null check (mode in ('quick', 'duel', 'league', 'party')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.friendships enable row level security;
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.predictions enable row level security;

create or replace function private.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.friendships
    where status = 'accepted'
      and (
        (requester_id = a and addressee_id = b)
        or (requester_id = b and addressee_id = a)
      )
  );
$$;

create or replace function private.share_league(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.league_members mine
    join public.league_members theirs on theirs.league_id = mine.league_id
    where mine.user_id = a and theirs.user_id = b
  );
$$;

create or replace function private.can_challenge(actor uuid, target uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  rule text;
begin
  if actor is null or target is null or actor = target then
    return false;
  end if;
  if exists (
    select 1 from public.friendships
    where status = 'blocked'
      and (
        (requester_id = actor and addressee_id = target)
        or (requester_id = target and addressee_id = actor)
      )
  ) then
    return false;
  end if;
  select coalesce(privacy->>'challenges', 'friends') into rule
  from public.profiles where id = target;
  if rule = 'nobody' then
    return false;
  end if;
  if rule = 'everyone' then
    return true;
  end if;
  return private.are_friends(actor, target) or private.share_league(actor, target);
end;
$$;

create or replace function private.resolve_answer(p_target uuid, p_question text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  q public.questions%rowtype;
  src public.questions%rowtype;
  ans record;
  trait text;
  lean int;
  signal int;
  weight int;
  relevant int := 0;
  score0 int := 0;
  score1 int := 0;
  margin int;
  real_choice smallint;
  allow_ai boolean;
  ev jsonb := '{}'::jsonb;
  support jsonb := '{}'::jsonb;
begin
  select * into q from public.questions where id = p_question;
  if not found then
    return jsonb_build_object('status', 'abstain', 'type', 'ai_prediction', 'message', 'No hay datos suficientes para predecir esta respuesta.');
  end if;

  select a.choice into real_choice
  from public.answers a
  where a.user_id = p_target and a.question_id = p_question;

  if real_choice is not null then
    return jsonb_build_object('status', 'real', 'type', 'real_answer', 'choice', real_choice);
  end if;

  select coalesce((privacy->>'allowAi')::boolean, true) into allow_ai
  from public.profiles where id = p_target;

  if allow_ai is distinct from true then
    return jsonb_build_object('status', 'abstain', 'type', 'ai_prediction', 'message', 'No hay datos suficientes para predecir esta respuesta.');
  end if;

  for ans in
    select a.choice, a.question_id from public.answers a where a.user_id = p_target and a.question_id <> p_question
  loop
    select * into src from public.questions where id = ans.question_id;
    if not exists (
      select 1 from jsonb_object_keys(q.leans) as key
      where src.leans ? key
    ) then
      continue;
    end if;
    relevant := relevant + 1;
    weight := case when src.category = q.category then 2 else 1 end;
    for trait in select jsonb_object_keys(q.leans)
    loop
      if src.leans ? trait then
        lean := (src.leans ->> trait)::int;
        signal := case when ans.choice = lean then 1 else -1 end;
        ev := jsonb_set(ev, array[trait], to_jsonb(coalesce((ev ->> trait)::int, 0) + signal * weight), true);
        support := jsonb_set(support, array[trait], to_jsonb(coalesce((support ->> trait)::int, 0) + weight), true);
      end if;
    end loop;
  end loop;

  if relevant < 3 then
    return jsonb_build_object('status', 'abstain', 'type', 'ai_prediction', 'message', 'No hay datos suficientes para predecir esta respuesta.');
  end if;

  for trait in select jsonb_object_keys(q.leans)
  loop
    if coalesce((support ->> trait)::int, 0) = 0 then
      continue;
    end if;
    lean := (q.leans ->> trait)::int;
    signal := coalesce((ev ->> trait)::int, 0);
    if lean = 0 then
      score0 := score0 + signal;
      score1 := score1 - signal;
    else
      score1 := score1 + signal;
      score0 := score0 - signal;
    end if;
  end loop;

  margin := abs(score0 - score1);
  if margin < 2 or score0 = score1 then
    return jsonb_build_object('status', 'abstain', 'type', 'ai_prediction', 'message', 'No hay datos suficientes para predecir esta respuesta.');
  end if;

  return jsonb_build_object(
    'status', 'predicted',
    'type', 'ai_prediction',
    'choice', case when score0 > score1 then 0 else 1 end
  );
end;
$$;

create or replace function private.prepare_prompt(p_target uuid, p_question text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved jsonb;
begin
  if not private.can_challenge(auth.uid(), p_target) then
    raise exception 'not allowed';
  end if;
  resolved := private.resolve_answer(p_target, p_question);
  if resolved ->> 'status' = 'abstain' then
    return jsonb_build_object('status', 'abstain', 'message', resolved ->> 'message');
  end if;
  return jsonb_build_object('status', 'ready');
end;
$$;

create or replace function private.submit_guess(
  p_target uuid,
  p_question text,
  p_choice smallint,
  p_mode text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved jsonb;
  resolved_choice smallint;
  answer_type text;
  is_correct boolean;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if p_choice not in (0, 1) then
    raise exception 'invalid choice';
  end if;
  if not private.can_challenge(auth.uid(), p_target) then
    raise exception 'not allowed';
  end if;

  resolved := private.resolve_answer(p_target, p_question);
  if resolved ->> 'status' = 'abstain' then
    return jsonb_build_object('status', 'abstain', 'message', resolved ->> 'message');
  end if;

  resolved_choice := (resolved ->> 'choice')::smallint;
  answer_type := resolved ->> 'type';
  is_correct := resolved_choice = p_choice;

  insert into public.predictions (predictor_id, target_id, question_id, choice, answer_type, correct, mode)
  values (auth.uid(), p_target, p_question, p_choice, answer_type, is_correct, p_mode);

  return jsonb_build_object(
    'status', 'scored',
    'type', answer_type,
    'correct', is_correct,
    'choice', resolved_choice
  );
end;
$$;

create or replace function public.prepare_prompt(p_target uuid, p_question text)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.prepare_prompt(p_target, p_question);
$$;

create or replace function public.submit_guess(p_target uuid, p_question text, p_choice smallint, p_mode text)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.submit_guess(p_target, p_question, p_choice, p_mode);
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base text;
  candidate text;
  suffix int := 0;
  code text;
begin
  base := lower(regexp_replace(split_part(coalesce(new.email, 'player'), '@', 1), '[^a-z0-9]', '', 'g'));
  if length(base) < 3 then
    base := 'player';
  end if;
  candidate := base;
  while exists (select 1 from public.profiles where username = candidate) loop
    suffix := suffix + 1;
    candidate := base || suffix::text;
  end loop;
  loop
    code := 'VL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));
    exit when not exists (select 1 from public.profiles where friend_code = code);
  end loop;
  insert into public.profiles (id, username, display_name, friend_code)
  values (
    new.id,
    candidate,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', candidate),
    code
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create policy questions_read on public.questions
  for select to anon, authenticated
  using (true);

create policy profiles_read on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or coalesce(privacy ->> 'visibility', 'friends') = 'everyone'
    or (
      coalesce(privacy ->> 'visibility', 'friends') = 'friends'
      and (private.are_friends(id, (select auth.uid())) or private.share_league(id, (select auth.uid())))
    )
  );

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy answers_own on public.answers
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy answers_insert on public.answers
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy friendships_read on public.friendships
  for select to authenticated
  using (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()));

create policy friendships_insert on public.friendships
  for insert to authenticated
  with check (requester_id = (select auth.uid()));

create policy friendships_update on public.friendships
  for update to authenticated
  using (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()))
  with check (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()));

create policy leagues_read on public.leagues
  for select to authenticated
  using (
    owner_id = (select auth.uid())
    or exists (
      select 1 from public.league_members
      where league_id = id and user_id = (select auth.uid())
    )
  );

create policy leagues_insert on public.leagues
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy league_members_read on public.league_members
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.league_members mine
      where mine.league_id = league_members.league_id
        and mine.user_id = (select auth.uid())
    )
  );

create policy predictions_read on public.predictions
  for select to authenticated
  using (predictor_id = (select auth.uid()) or target_id = (select auth.uid()));

grant usage on schema public to anon, authenticated;
grant select on public.questions to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert on public.answers to authenticated;
grant select, insert, update on public.friendships to authenticated;
grant select, insert on public.leagues to authenticated;
grant select on public.league_members to authenticated;
grant select on public.predictions to authenticated;

grant execute on function private.resolve_answer(uuid, text) to postgres;
revoke all on function private.resolve_answer(uuid, text) from public, anon, authenticated;
revoke all on function private.handle_new_user() from public, anon, authenticated;

create policy league_members_insert on public.league_members
  for insert to authenticated
  with check (
    exists (
      select 1 from public.leagues
      where id = league_id and owner_id = (select auth.uid())
    )
  );

grant insert on public.league_members to authenticated;
grant usage on schema private to authenticated;
grant execute on function private.prepare_prompt(uuid, text) to authenticated;
grant execute on function private.submit_guess(uuid, text, smallint, text) to authenticated;
grant execute on function public.prepare_prompt(uuid, text) to authenticated;
grant execute on function public.submit_guess(uuid, text, smallint, text) to authenticated;
revoke all on function public.prepare_prompt(uuid, text) from anon, public;
revoke all on function public.submit_guess(uuid, text, smallint, text) from anon, public;
insert into public.questions (id, category, emoji, prompt, option_a, option_b, leans) values
('q_pizza', 'comida', '🍕', '¿Pizza o hamburguesa?', 'Pizza', 'Hamburguesa', '{"comfort":0,"night":1}'::jsonb),
('q_breakfast', 'comida', '☕', '¿Desayuno grande o café y listo?', 'Desayuno grande', 'Café y listo', '{"comfort":0,"planner":1}'::jsonb),
('q_cook', 'comida', '🍳', '¿Cocinar o pedir?', 'Cocinar', 'Pedir', '{"planner":0,"spender":1}'::jsonb),
('q_beach', 'viajes', '🏖️', '¿Playa o montaña?', 'Playa', 'Montaña', '{"comfort":0,"adventure":1}'::jsonb),
('q_solo', 'viajes', '🎒', '¿Viajar solo o acompañado?', 'Solo', 'Acompañado', '{"adventure":0,"outgoing":1}'::jsonb),
('q_plan', 'viajes', '🗺️', '¿Itinerario cerrado o improvisar?', 'Itinerario', 'Improvisar', '{"planner":0,"adventure":1}'::jsonb),
('q_money', 'dinero', '💸', '¿Ahorrar o gastar?', 'Ahorrar', 'Gastar', '{"planner":0,"spender":1}'::jsonb),
('q_gift', 'dinero', '🎁', '¿Regalo útil o regalo sorpresa?', 'Útil', 'Sorpresa', '{"planner":0,"outgoing":1}'::jsonb),
('q_split', 'dinero', '💳', '¿Pagar a medias o invitar yo?', 'A medias', 'Invito yo', '{"planner":0,"spender":1}'::jsonb),
('q_night', 'planes', '🏠', '¿Salir o quedarse en casa?', 'Salir', 'Quedarme', '{"outgoing":0,"night":0,"comfort":1}'::jsonb),
('q_friday', 'planes', '📅', '¿Plan con tiempo o a última hora?', 'Con tiempo', 'A última hora', '{"planner":0,"night":1}'::jsonb),
('q_group', 'planes', '👥', '¿Grupo grande o grupo pequeño?', 'Grande', 'Pequeño', '{"outgoing":0,"comfort":1}'::jsonb),
('q_music', 'musica', '🎧', '¿Playlist o aleatorio?', 'Playlist', 'Aleatorio', '{"planner":0,"adventure":1}'::jsonb),
('q_live', 'musica', '🎤', '¿Concierto o auriculares?', 'Concierto', 'Auriculares', '{"outgoing":0,"comfort":1}'::jsonb),
('q_volume', 'musica', '🔊', '¿Volumen alto o bajo?', 'Alto', 'Bajo', '{"night":0,"comfort":1}'::jsonb),
('q_sport', 'deporte', '⚽', '¿Deporte de equipo o solo?', 'Equipo', 'Solo', '{"outgoing":0,"adventure":1}'::jsonb),
('q_gym', 'deporte', '🏃', '¿Gimnasio o aire libre?', 'Gimnasio', 'Aire libre', '{"planner":0,"adventure":1}'::jsonb),
('q_win', 'deporte', '🏅', '¿Competir o pasarlo bien?', 'Competir', 'Pasarlo bien', '{"outgoing":0,"comfort":1}'::jsonb),
('q_late', 'noche', '🌙', '¿Quedarte hasta tarde o irte pronto?', 'Hasta tarde', 'Pronto', '{"night":0,"planner":1}'::jsonb),
('q_toast', 'noche', '🥂', '¿Brindar o agua?', 'Brindar', 'Agua', '{"outgoing":0,"planner":1}'::jsonb),
('q_dance', 'noche', '💃', '¿Bailar o conversar?', 'Bailar', 'Conversar', '{"outgoing":0,"comfort":1}'::jsonb),
('q_home', 'casa', '🛋️', '¿Orden o caos creativo?', 'Orden', 'Caos creativo', '{"planner":0,"adventure":1}'::jsonb),
('q_pet', 'casa', '🐾', '¿Perro o gato?', 'Perro', 'Gato', '{"outgoing":0,"comfort":1}'::jsonb),
('q_host', 'casa', '🚪', '¿Recibir gente o casa en calma?', 'Recibir gente', 'Casa en calma', '{"outgoing":0,"comfort":1}'::jsonb),
('q_style', 'estilo', '🖤', '¿Todo negro o color?', 'Todo negro', 'Color', '{"night":0,"outgoing":1}'::jsonb),
('q_shop', 'estilo', '🛍️', '¿Marcas o de segunda?', 'Marcas', 'De segunda', '{"spender":0,"planner":1}'::jsonb),
('q_fit', 'estilo', '👟', '¿Arreglado o cómodo?', 'Arreglado', 'Cómodo', '{"planner":0,"comfort":1}'::jsonb),
('q_meet', 'gente', '🗣️', '¿Hablar con desconocidos o quedarte con los tuyos?', 'Desconocidos', 'Los míos', '{"outgoing":0,"comfort":1}'::jsonb),
('q_text', 'gente', '💬', '¿Audio o texto?', 'Audio', 'Texto', '{"outgoing":0,"planner":1}'::jsonb),
('q_secret', 'gente', '🤫', '¿Contarlo todo o guardártelo?', 'Contarlo', 'Guardármelo', '{"outgoing":0,"comfort":1}'::jsonb),
('q_morning', 'tiempo', '⏰', '¿Madrugar o dormir?', 'Madrugar', 'Dormir', '{"planner":0,"night":1}'::jsonb),
('q_weekend', 'tiempo', '📆', '¿Agenda llena o hueco vacío?', 'Agenda llena', 'Hueco vacío', '{"outgoing":0,"comfort":1}'::jsonb),
('q_rush', 'tiempo', '⏱️', '¿Con prisa o con margen?', 'Con prisa', 'Con margen', '{"night":0,"planner":1}'::jsonb),
('q_film', 'gustos', '🎬', '¿Cine o peli en casa?', 'Cine', 'En casa', '{"outgoing":0,"comfort":1}'::jsonb),
('q_book', 'gustos', '📚', '¿Libro o serie?', 'Libro', 'Serie', '{"comfort":0,"night":1}'::jsonb),
('q_season', 'gustos', '🌤️', '¿Verano o invierno?', 'Verano', 'Invierno', '{"outgoing":0,"comfort":1}'::jsonb),
('q_sweet', 'comida', '🍰', '¿Dulce o salado?', 'Dulce', 'Salado', '{"comfort":0,"planner":1}'::jsonb),
('q_spice', 'comida', '🌶️', '¿Picante o suave?', 'Picante', 'Suave', '{"adventure":0,"comfort":1}'::jsonb),
('q_city', 'viajes', '🏙️', '¿Ciudad o pueblo?', 'Ciudad', 'Pueblo', '{"outgoing":0,"comfort":1}'::jsonb),
('q_fly', 'viajes', '✈️', '¿Avión o tren?', 'Avión', 'Tren', '{"spender":0,"planner":1}'::jsonb),
('q_tip', 'dinero', '🪙', '¿Propina generosa o justa?', 'Generosa', 'Justa', '{"spender":0,"planner":1}'::jsonb),
('q_sale', 'dinero', '🏷️', '¿Esperar la rebaja o comprarlo ya?', 'Esperar', 'Ya', '{"planner":0,"spender":1}'::jsonb),
('q_surprise', 'planes', '🎁', '¿Plan sorpresa o plan contado?', 'Sorpresa', 'Contado', '{"adventure":0,"planner":1}'::jsonb),
('q_rain', 'planes', '🌧️', '¿Si llueve, cancelar o salir igual?', 'Cancelar', 'Salir igual', '{"comfort":0,"adventure":1}'::jsonb),
('q_lyrics', 'musica', '🎶', '¿Cantado o instrumental?', 'Cantado', 'Instrumental', '{"outgoing":0,"comfort":1}'::jsonb),
('q_ears', 'musica', '🎧', '¿Compartir auriculares o cada uno lo suyo?', 'Compartir', 'Cada uno', '{"outgoing":0,"comfort":1}'::jsonb),
('q_watch', 'deporte', '📺', '¿Ver el partido o jugarlo?', 'Verlo', 'Jugarlo', '{"comfort":0,"outgoing":1}'::jsonb),
('q_train', 'deporte', '🌅', '¿Entreno de mañana o de noche?', 'Mañana', 'Noche', '{"planner":0,"night":1}'::jsonb),
('q_after', 'noche', '🌃', '¿After o a casa?', 'After', 'A casa', '{"night":0,"comfort":1}'::jsonb),
('q_camera', 'noche', '📸', '¿Fotos de la noche o nada de cámara?', 'Fotos', 'Nada', '{"outgoing":0,"comfort":1}'::jsonb),
('q_plants', 'casa', '🪴', '¿Plantas o espacios vacíos?', 'Plantas', 'Vacío', '{"comfort":0,"planner":1}'::jsonb),
('q_sofa', 'casa', '🛋️', '¿Sofá compartido o cada uno en su sitio?', 'Compartido', 'Cada uno', '{"outgoing":0,"comfort":1}'::jsonb),
('q_scent', 'estilo', '🧴', '¿Perfume o nada?', 'Perfume', 'Nada', '{"outgoing":0,"comfort":1}'::jsonb),
('q_sun', 'estilo', '🕶️', '¿Gafas de sol o gorra?', 'Gafas', 'Gorra', '{"planner":0,"comfort":1}'::jsonb),
('q_call', 'gente', '📞', '¿Llamar o escribir?', 'Llamar', 'Escribir', '{"outgoing":0,"planner":1}'::jsonb),
('q_mute', 'gente', '🔕', '¿Grupo de chat activo o silenciado?', 'Activo', 'Silenciado', '{"outgoing":0,"comfort":1}'::jsonb),
('q_early', 'tiempo', '⌚', '¿Llegar pronto o en punto?', 'Pronto', 'En punto', '{"planner":0,"night":1}'::jsonb),
('q_nap', 'tiempo', '😴', '¿Siesta o seguir?', 'Siesta', 'Seguir', '{"comfort":0,"planner":1}'::jsonb),
('q_board', 'gustos', '🎲', '¿Videojuego o juego de mesa?', 'Videojuego', 'Mesa', '{"night":0,"outgoing":1}'::jsonb),
('q_quiet', 'gustos', '🎙️', '¿Podcast o silencio?', 'Podcast', 'Silencio', '{"outgoing":0,"comfort":1}'::jsonb);
