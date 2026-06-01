-- ==========================
-- 운동기록 모듈 마이그레이션 0011
-- 7 테이블 + RLS + 3개 트리거 + 사이드바 RPC
-- ==========================

-- 운동 종목 마스터
create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  body_part text not null check (body_part in (
    'Arms','Back','Cardio','Chest','Core','Full Body','Legs','Olympic','Other','Shoulders'
  )),
  category text not null check (category in (
    'Barbell','Dumbbell','Machine','Cable','Bodyweight','Assisted Bodyweight','Reps Only','Cardio','Duration','Other'
  )),
  sort_order int not null default 0,
  created_at timestamptz default now(),
  unique (user_id, name)
);
alter table public.workout_exercises enable row level security;
create policy "own_rows" on public.workout_exercises for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 템플릿 폴더
create table public.workout_template_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz default now()
);
alter table public.workout_template_folders enable row level security;
create policy "own_rows" on public.workout_template_folders for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 루틴
create table public.workout_routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid references public.workout_template_folders(id) on delete set null,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.workout_routines enable row level security;
create policy "own_rows" on public.workout_routines for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 루틴 내 운동
create table public.workout_routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.workout_routines(id) on delete cascade,
  exercise_id uuid not null references public.workout_exercises(id) on delete cascade,
  default_sets int not null default 3,
  sort_order int not null default 0
);
alter table public.workout_routine_exercises enable row level security;
create policy "via_routine" on public.workout_routine_exercises for all
  using (exists (
    select 1 from public.workout_routines r
    where r.id = routine_id and r.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.workout_routines r
    where r.id = routine_id and r.user_id = auth.uid()
  ));

-- 워크아웃 세션
create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_minutes int,
  routine_id uuid,
  routine_name text,
  folder_name text,
  total_weight_kg numeric(10,2) not null default 0,
  pr_count int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index workout_sessions_user_date_idx on public.workout_sessions(user_id, date desc);
alter table public.workout_sessions enable row level security;
create policy "own_rows" on public.workout_sessions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 세션 내 운동 (스냅샷)
create table public.workout_session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id uuid,
  exercise_name text not null,
  body_part text not null,
  category text not null,
  sort_order int not null default 0
);
create index workout_session_exercises_session_idx on public.workout_session_exercises(session_id, sort_order);
alter table public.workout_session_exercises enable row level security;
create policy "via_session" on public.workout_session_exercises for all
  using (exists (
    select 1 from public.workout_sessions s
    where s.id = session_id and s.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.workout_sessions s
    where s.id = session_id and s.user_id = auth.uid()
  ));

-- 세트
create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  session_exercise_id uuid not null references public.workout_session_exercises(id) on delete cascade,
  set_number int not null,
  set_type text not null check (set_type in ('warmup','working','failure')) default 'working',
  weight_kg numeric(7,2),
  reps int,
  duration_seconds int,
  completed boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz default now()
);
create index workout_sets_session_exercise_idx on public.workout_sets(session_exercise_id, sort_order);
alter table public.workout_sets enable row level security;
create policy "via_session_exercise" on public.workout_sets for all
  using (exists (
    select 1
    from public.workout_session_exercises se
    join public.workout_sessions s on s.id = se.session_id
    where se.id = session_exercise_id and s.user_id = auth.uid()
  ))
  with check (exists (
    select 1
    from public.workout_session_exercises se
    join public.workout_sessions s on s.id = se.session_id
    where se.id = session_exercise_id and s.user_id = auth.uid()
  ));

-- PR 자동 추적
create table public.workout_personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_name text not null,
  weight_kg numeric(7,2) not null,
  reps int not null,
  estimated_1rm numeric(10,2) not null,
  achieved_at timestamptz not null default now(),
  session_id uuid references public.workout_sessions(id) on delete set null,
  set_id uuid references public.workout_sets(id) on delete set null
);
create index workout_personal_records_user_exercise_idx
  on public.workout_personal_records(user_id, exercise_name, estimated_1rm desc);
alter table public.workout_personal_records enable row level security;
create policy "own_rows" on public.workout_personal_records for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ==========================
-- 트리거 1: workout_sets → 세션 total_weight_kg 재계산 + PR 체크
-- ==========================

create or replace function public.recalc_session_after_set()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_user_id uuid;
  v_exercise_name text;
  v_best_1rm numeric;
  v_best_weight numeric;
  v_best_reps int;
  v_best_set_id uuid;
  v_existing_pr_1rm numeric;
begin
  if (tg_op = 'DELETE') then
    select se.session_id, se.exercise_name, s.user_id
      into v_session_id, v_exercise_name, v_user_id
      from public.workout_session_exercises se
      join public.workout_sessions s on s.id = se.session_id
      where se.id = old.session_exercise_id;
  else
    select se.session_id, se.exercise_name, s.user_id
      into v_session_id, v_exercise_name, v_user_id
      from public.workout_session_exercises se
      join public.workout_sessions s on s.id = se.session_id
      where se.id = new.session_exercise_id;
  end if;

  if v_session_id is null then return coalesce(new, old); end if;

  update public.workout_sessions
  set total_weight_kg = coalesce((
    select sum(coalesce(s.weight_kg, 0) * coalesce(s.reps, 0))
    from public.workout_sets s
    join public.workout_session_exercises se on se.id = s.session_exercise_id
    where se.session_id = v_session_id and s.completed = true
  ), 0),
  updated_at = now()
  where id = v_session_id;

  select max(weight_kg * (1 + reps::numeric / 30)) into v_best_1rm
    from public.workout_sets s
    join public.workout_session_exercises se on se.id = s.session_exercise_id
    where se.session_id = v_session_id
      and se.exercise_name = v_exercise_name
      and s.set_type = 'working'
      and s.completed = true
      and s.weight_kg is not null
      and s.reps is not null;

  if v_best_1rm is not null then
    select coalesce(max(estimated_1rm), 0) into v_existing_pr_1rm
      from public.workout_personal_records
      where user_id = v_user_id and exercise_name = v_exercise_name;

    if v_best_1rm > v_existing_pr_1rm then
      select s.weight_kg, s.reps, s.id into v_best_weight, v_best_reps, v_best_set_id
        from public.workout_sets s
        join public.workout_session_exercises se on se.id = s.session_exercise_id
        where se.session_id = v_session_id
          and se.exercise_name = v_exercise_name
          and s.set_type = 'working'
          and s.completed = true
          and s.weight_kg is not null
          and s.reps is not null
        order by (s.weight_kg * (1 + s.reps::numeric / 30)) desc
        limit 1;

      insert into public.workout_personal_records
        (user_id, exercise_name, weight_kg, reps, estimated_1rm, session_id, set_id)
      values
        (v_user_id, v_exercise_name, v_best_weight, v_best_reps, v_best_1rm, v_session_id, v_best_set_id);

      update public.workout_sessions
      set pr_count = pr_count + 1
      where id = v_session_id;
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

create trigger trg_workout_sets_recalc
after insert or update or delete on public.workout_sets
for each row execute function public.recalc_session_after_set();

-- ==========================
-- 트리거 2: workout_sessions.ended_at → duration_minutes
-- ==========================

create or replace function public.calc_session_duration()
returns trigger
language plpgsql
as $$
begin
  if new.ended_at is not null then
    new.duration_minutes := greatest(0, extract(epoch from (new.ended_at - new.started_at))::int / 60);
  else
    new.duration_minutes := null;
  end if;
  return new;
end;
$$;

create trigger trg_workout_sessions_duration
before update of ended_at on public.workout_sessions
for each row execute function public.calc_session_duration();

-- ==========================
-- RPC: 사이드바용 distinct dates + 그날 첫 세션 라벨
-- ==========================

create or replace function public.get_user_workout_dates()
returns table(date date, label text)
language sql
stable
security invoker
set search_path = public
as $$
  select s.date,
         (select coalesce(s2.routine_name, '워크아웃')
          from public.workout_sessions s2
          where s2.user_id = auth.uid() and s2.date = s.date
          order by s2.started_at asc
          limit 1) as label
  from public.workout_sessions s
  where s.user_id = auth.uid()
  group by s.date
  order by s.date desc;
$$;
grant execute on function public.get_user_workout_dates() to authenticated;
