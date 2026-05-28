-- 0002_core_schema.sql
-- 가계부 모듈 핵심 5테이블 + 인덱스 + updated_at 자동 갱신 트리거

-- 카테고리 (1차/2차, 드롭다운용)
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.categories(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income','expense')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index categories_user_parent_idx
  on public.categories (user_id, parent_id);

-- 결제수단
create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  active boolean not null default true
);

-- 고정지출 템플릿
create table public.fixed_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  day_of_month int not null check (day_of_month between 1 and 31),
  type text not null check (type in ('income','expense')),
  category_1st text not null,
  category_2nd text,
  payment_method text,
  description text,
  amount numeric(14,2) not null,
  active boolean not null default true
);
create index fixed_expenses_user_active_idx
  on public.fixed_expenses (user_id, active);

-- 거래 (메인 테이블, 스냅샷 패턴 절대 준수)
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  year_month text not null check (year_month ~ '^\d{4}-\d{2}$'),
  date date not null,
  type text not null check (type in ('income','expense')),
  category_1st text not null,    -- 스냅샷 (FK 아님)
  category_2nd text,              -- 스냅샷
  payment_method text,            -- 스냅샷
  description text,
  amount numeric(14,2) not null,
  is_paid boolean not null default false,
  is_fixed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index transactions_user_ym_idx
  on public.transactions (user_id, year_month);
create index transactions_user_date_idx
  on public.transactions (user_id, date);

-- 월별 요약 (트리거 관리, 복합 PK)
create table public.monthly_summaries (
  user_id uuid not null references public.profiles(id) on delete cascade,
  year_month text not null check (year_month ~ '^\d{4}-\d{2}$'),
  opening_balance numeric(14,2) not null default 0,
  income_total numeric(14,2) not null default 0,
  expense_total numeric(14,2) not null default 0,
  paid_total numeric(14,2) not null default 0,
  unpaid_total numeric(14,2) not null default 0,
  current_balance numeric(14,2) not null default 0,
  expected_balance numeric(14,2) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, year_month)
);

-- updated_at 자동 갱신
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trg_transactions_touch
  before update on public.transactions
  for each row execute function public.touch_updated_at();

create trigger trg_monthly_summaries_touch
  before update on public.monthly_summaries
  for each row execute function public.touch_updated_at();
