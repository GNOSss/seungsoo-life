-- ADR-025: 입금도 is_paid 분기 — 실제 받은 입금만 income_total/current_balance에 반영
--
-- 변경:
-- - income_total: 이전엔 모든 입금 합. 이제 type='income' AND is_paid=true 만.
-- - current_balance = 전월잔고 + 실제 입금(paid) - 실제 출금(paid)
-- - expected_balance = current + 미결제 입금(pending) - 미결제 출금(unpaid)
--   → 월말까지 모든 예정이 정산됐을 때 예상 잔고
-- - expense_total: 변경 없음 (전체 출금 합)
-- - paid_total, unpaid_total: 변경 없음 (출금 기준)
--
-- 영향:
-- - 미결제 입금이 입금 총액에서 빠지고 예상 잔고로 이동
-- - 출금/대기/완료 로직과 대칭

CREATE OR REPLACE FUNCTION public.recalc_monthly_summaries(
  p_user_id uuid,
  p_from_year_month text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_year_month text;
  v_prior_balance numeric(14,2);
  v_income_paid numeric(14,2);
  v_income_pending numeric(14,2);
  v_expense_total numeric(14,2);
  v_paid_total numeric(14,2);
  v_unpaid_total numeric(14,2);
  v_current_balance numeric(14,2);
  v_expected_balance numeric(14,2);
BEGIN
  FOR v_year_month IN
    SELECT DISTINCT ym FROM (
      SELECT year_month AS ym FROM public.transactions
        WHERE user_id = p_user_id AND year_month >= p_from_year_month
      UNION
      SELECT year_month AS ym FROM public.monthly_summaries
        WHERE user_id = p_user_id AND year_month >= p_from_year_month
    ) s
    ORDER BY ym
  LOOP
    SELECT COALESCE(current_balance, 0) INTO v_prior_balance
      FROM public.monthly_summaries
      WHERE user_id = p_user_id AND year_month < v_year_month
      ORDER BY year_month DESC
      LIMIT 1;
    v_prior_balance := COALESCE(v_prior_balance, 0);

    SELECT
      COALESCE(SUM(CASE WHEN type='income' AND is_paid THEN amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN type='income' AND NOT is_paid THEN amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN type='expense' AND is_paid THEN amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN type='expense' AND NOT is_paid THEN amount ELSE 0 END), 0)
    INTO v_income_paid, v_income_pending, v_expense_total, v_paid_total, v_unpaid_total
    FROM public.transactions
    WHERE user_id = p_user_id AND year_month = v_year_month;

    v_current_balance := v_prior_balance + v_income_paid - v_paid_total;
    v_expected_balance := v_current_balance + v_income_pending - v_unpaid_total;

    INSERT INTO public.monthly_summaries (
      user_id, year_month, opening_balance,
      income_total, expense_total, paid_total, unpaid_total,
      current_balance, expected_balance, updated_at
    ) VALUES (
      p_user_id, v_year_month, v_prior_balance,
      v_income_paid, v_expense_total, v_paid_total, v_unpaid_total,
      v_current_balance, v_expected_balance, now()
    )
    ON CONFLICT (user_id, year_month) DO UPDATE SET
      opening_balance = excluded.opening_balance,
      income_total = excluded.income_total,
      expense_total = excluded.expense_total,
      paid_total = excluded.paid_total,
      unpaid_total = excluded.unpaid_total,
      current_balance = excluded.current_balance,
      expected_balance = excluded.expected_balance,
      updated_at = now();
  END LOOP;
END $$;

-- 적용 시점에 모든 사용자의 기존 데이터 새 공식으로 재계산
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  FOR v_user_id IN SELECT DISTINCT user_id FROM public.monthly_summaries
  LOOP
    PERFORM public.recalc_monthly_summaries(v_user_id, '0000-01');
  END LOOP;
END $$;
