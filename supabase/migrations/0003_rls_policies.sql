-- 0003_rls_policies.sql
-- 모든 사용자 데이터 테이블에 RLS enable + "본인 데이터만" 정책

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.payment_methods enable row level security;
alter table public.fixed_expenses enable row level security;
alter table public.transactions enable row level security;
alter table public.monthly_summaries enable row level security;

create policy "own profile" on public.profiles
  for all
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "own categories" on public.categories
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "own payment_methods" on public.payment_methods
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "own fixed_expenses" on public.fixed_expenses
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "own transactions" on public.transactions
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "own monthly_summaries" on public.monthly_summaries
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
