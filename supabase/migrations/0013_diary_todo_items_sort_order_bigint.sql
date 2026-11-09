-- sort_order에 Date.now() (밀리초 타임스탬프, 13자리)를 넣는데 int4 범위(약 21억)를 초과해
-- "Out of range for type integer" 에러 발생. bigint로 변경.

alter table public.diary_todo_items alter column sort_order type bigint;
