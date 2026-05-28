-- 0004_balance_cascade_trigger.sql
-- 잔고 연쇄 갱신: transactions 변경 시 해당 월 + 이후 모든 월의 monthly_summaries 자동 재계산
-- 이게 이 앱의 핵심 비즈니스 로직

create or replace function public.recalc_monthly_summaries(
  p_user_id uuid,
  p_from_year_month text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year_month text;
  v_prior_balance numeric(14,2);
  v_income_total numeric(14,2);
  v_expense_total numeric(14,2);
  v_paid_total numeric(14,2);
  v_unpaid_total numeric(14,2);
  v_current_balance numeric(14,2);
  v_expected_balance numeric(14,2);
begin
  -- 영향받는 월 집합 = transactions 또는 monthly_summaries에 있는 >= from 월들
  for v_year_month in
    select distinct ym from (
      select year_month as ym from public.transactions
        where user_id = p_user_id and year_month >= p_from_year_month
      union
      select year_month as ym from public.monthly_summaries
        where user_id = p_user_id and year_month >= p_from_year_month
    ) s
    order by ym
  loop
    -- 직전 월 잔고 (없으면 0)
    select coalesce(current_balance, 0) into v_prior_balance
      from public.monthly_summaries
      where user_id = p_user_id and year_month < v_year_month
      order by year_month desc
      limit 1;
    v_prior_balance := coalesce(v_prior_balance, 0);

    -- 이번 월 합산
    select
      coalesce(sum(case when type='income' then amount else 0 end), 0),
      coalesce(sum(case when type='expense' then amount else 0 end), 0),
      coalesce(sum(case when type='expense' and is_paid then amount else 0 end), 0),
      coalesce(sum(case when type='expense' and not is_paid then amount else 0 end), 0)
    into v_income_total, v_expense_total, v_paid_total, v_unpaid_total
    from public.transactions
    where user_id = p_user_id and year_month = v_year_month;

    v_current_balance := v_prior_balance + v_income_total - v_paid_total;
    v_expected_balance := v_current_balance - v_unpaid_total;

    insert into public.monthly_summaries (
      user_id, year_month, opening_balance,
      income_total, expense_total, paid_total, unpaid_total,
      current_balance, expected_balance, updated_at
    ) values (
      p_user_id, v_year_month, v_prior_balance,
      v_income_total, v_expense_total, v_paid_total, v_unpaid_total,
      v_current_balance, v_expected_balance, now()
    )
    on conflict (user_id, year_month) do update set
      opening_balance = excluded.opening_balance,
      income_total = excluded.income_total,
      expense_total = excluded.expense_total,
      paid_total = excluded.paid_total,
      unpaid_total = excluded.unpaid_total,
      current_balance = excluded.current_balance,
      expected_balance = excluded.expected_balance,
      updated_at = now();
  end loop;
end $$;

-- transactions에 대한 트리거 래퍼 (INSERT/UPDATE/DELETE 분기 + 시작 월 결정)
create or replace function public.transactions_recalc_trigger()
returns trigger
language plpgsql
as $$
declare
  v_user_id uuid;
  v_from text;
begin
  if (tg_op = 'INSERT') then
    v_user_id := new.user_id;
    v_from := new.year_month;
  elsif (tg_op = 'DELETE') then
    v_user_id := old.user_id;
    v_from := old.year_month;
  else  -- UPDATE
    v_user_id := new.user_id;
    v_from := least(new.year_month, old.year_month);
  end if;

  perform public.recalc_monthly_summaries(v_user_id, v_from);

  if (tg_op = 'DELETE') then
    return old;
  else
    return new;
  end if;
end $$;

create trigger trg_transactions_recalc
  after insert or update or delete on public.transactions
  for each row execute function public.transactions_recalc_trigger();
