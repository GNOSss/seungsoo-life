-- 사이드바용 distinct Mondays 반환 함수.
-- diary_days를 그대로 select하면 PostgREST 기본 max-rows(1000)에 잘려서
-- 1675 row 중 일부만 도착. DISTINCT week로 ~200 row만 반환하면 캡과 무관.
create or replace function public.get_user_diary_mondays()
returns table(monday date)
language sql
stable
security invoker
set search_path = public
as $$
  select distinct date_trunc('week', date)::date as monday
  from public.diary_days
  where user_id = auth.uid()
  order by monday desc;
$$;

grant execute on function public.get_user_diary_mondays() to authenticated;
