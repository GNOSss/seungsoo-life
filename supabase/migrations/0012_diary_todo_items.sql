-- 구조화된 할 일/위시리스트 (Notion DB 스타일). diary_notes(마크다운 블록)와 별개.
-- 사용자당 다수 row. kind = 'todo' 또는 'wish'.

create table public.diary_todo_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('todo', 'wish')),
  importance text not null default 'mid' check (importance in ('high', 'mid', 'low')),
  item_date date,
  item_time time,
  target text,
  title text not null check (char_length(trim(title)) > 0),
  detail text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.diary_todo_items enable row level security;

create policy "own_rows" on public.diary_todo_items for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create index diary_todo_items_user_kind_idx on public.diary_todo_items (user_id, kind);
