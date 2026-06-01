-- 일기장 메모 페이지 (할 것 / 하고 싶은 것). 마크다운 본문.
-- 사용자당 kind별 1개 row (kind = 'todo' 또는 'wish').

create table public.diary_notes (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('todo', 'wish')),
  content text not null default '',
  updated_at timestamptz default now(),
  primary key (user_id, kind)
);

alter table public.diary_notes enable row level security;

create policy "own_rows" on public.diary_notes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 기존 사용자에게 빈 todo + wish row 시드
insert into public.diary_notes (user_id, kind, content)
select u.id, k, ''
from auth.users u, (values ('todo'), ('wish')) as kinds(k)
on conflict do nothing;
