-- diary_entries.owner_date: 이 entry를 만들어낸 페이지의 날짜 (입력 page = D).
-- 자정 넘김 split된 row의 경우, "오늘 날짜"는 D-1일 수 있으나 owner_date는 D(편집 페이지).
-- → 사용자가 D 페이지 재편집 시 owner_date=D인 row만 wipe하면 D-1의 자기자신 입력 entries는 보존됨.

alter table public.diary_entries
  add column owner_date date;

-- 1. 모든 row를 일단 self date로 backfill
update public.diary_entries set owner_date = date;

-- 2. "어제 split" 행 (end_time=23:59:59 AND 다음 날에 같은 raw_input+activity_name의 00:00:00 시작 row 존재):
--    이건 D+1 페이지 입력이 자정 넘김으로 만든 split. → owner_date = date + 1
update public.diary_entries e
set owner_date = date + 1
where end_time = '23:59:59'
  and exists (
    select 1 from public.diary_entries n
    where n.user_id = e.user_id
      and n.date = e.date + 1
      and n.start_time = '00:00:00'
      and n.raw_input = e.raw_input
      and n.activity_name = e.activity_name
  );

alter table public.diary_entries
  alter column owner_date set not null;

create index diary_entries_user_owner_idx
  on public.diary_entries (user_id, owner_date);
