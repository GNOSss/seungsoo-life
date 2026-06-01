-- diary_activities
create table public.diary_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null,
  sort_order int not null default 0,
  created_at timestamptz default now(),
  unique (user_id, name)
);
alter table public.diary_activities enable row level security;
create policy "own_rows" on public.diary_activities for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- diary_quests
create table public.diary_quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz default now()
);
alter table public.diary_quests enable row level security;
create policy "own_rows" on public.diary_quests for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- diary_days
create table public.diary_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  raw_input text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, date)
);
alter table public.diary_days enable row level security;
create policy "own_rows" on public.diary_days for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- diary_entries
create table public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  duration_minutes int not null default 0,
  activity_name text not null,
  color text not null default '#D8D8D8',
  raw_input text,
  created_at timestamptz default now()
);
create index diary_entries_user_date_idx
  on public.diary_entries (user_id, date);
alter table public.diary_entries enable row level security;
create policy "own_rows" on public.diary_entries for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- duration_minutes 자동 계산 트리거
create or replace function public.calc_diary_entry_duration() returns trigger
language plpgsql security definer set search_path to 'public' as $$
begin
  new.duration_minutes := greatest(
    0,
    extract(epoch from (new.end_time - new.start_time))::int / 60
  );
  return new;
end;
$$;

create trigger trg_diary_entries_duration
before insert or update on public.diary_entries
for each row execute function public.calc_diary_entry_duration();

-- diary_quest_checks
create table public.diary_quest_checks (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  quest_id uuid not null references public.diary_quests(id) on delete cascade,
  checked boolean not null default false,
  primary key (user_id, date, quest_id)
);
alter table public.diary_quest_checks enable row level security;
create policy "own_rows" on public.diary_quest_checks for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 시드 — 활동 라이브러리 6개
insert into public.diary_activities (user_id, name, color, sort_order)
select u.id, x.name, x.color, x.sort_order
from auth.users u, (values
  ('잠',  '#F5A623', 1),
  ('근무', '#E91E63', 2),
  ('쉼',  '#4A4A4A', 3),
  ('공부', '#7B68EE', 4),
  ('운동', '#4FC3F7', 5),
  ('외식', '#D0021B', 6)
) as x(name, color, sort_order)
on conflict (user_id, name) do nothing;

-- 시드 — Daily Quest 5개
insert into public.diary_quests (user_id, name, sort_order, active)
select u.id, x.name, x.sort_order, true
from auth.users u, (values
  ('헬스', 1),
  ('독서 1시간', 2),
  ('중국어 회화 및 공부', 3),
  ('자기개발', 4),
  ('시황 및 자산 체크', 5)
) as x(name, sort_order);
