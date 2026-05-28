# Phase 3: DB 백엔드 인프라 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 가계부 UI(Phase 4)가 작동할 수 있는 Supabase 백엔드 인프라(원격 프로젝트 + Google OAuth + 6테이블 + RLS + 잔고 연쇄 트리거)를 만들고 SQL로 검증한다.

**Architecture:** Supabase 원격 프로젝트(region ap-northeast-2, 조직 SEUNGSOO)에 4개 SQL 마이그레이션 파일을 순차 적용. Google OAuth는 Supabase dashboard에서 활성화. 마이그레이션 파일은 git에 커밋되어 재배포 가능. 잔고 연쇄 트리거는 행 단위(row-level)로 동작하며 SQL 수동 시나리오로 검증.

**Tech Stack:** Supabase Postgres (원격), Supabase Auth + Google OAuth, MCP `apply_migration` / `execute_sql`, PL/pgSQL (security definer 함수). 테스트 프레임워크 없음 (SQL 수동 검증).

**Spec:** `docs/superpowers/specs/2026-05-28-phase3-db-design.md`

---

## 사전 상태

- 디렉토리: `/Users/seungsoosmacbook/Desktop/seungsoo-life/`
- 최근 커밋: `2c97a00 docs: Phase 3 DB 백엔드 인프라 설계 spec 작성`
- Phase 2 완료 상태: Next.js 14 + Tailwind + shadcn + Serwist PWA + Supabase 클라이언트 코드 (`lib/supabase/client.ts`, `lib/supabase/server.ts`) 작성됨, 환경변수 미설정
- 패키지 매니저: pnpm 11.x
- 현재 Supabase 프로젝트: **없음** (MCP `list_projects` → 0개)
- 조직: `SEUNGSOO` (slug `yayyvzxqfahwvjqzwbhf`, 이미 존재)
- `.env.local`: 없음 (예시 파일 `.env.local.example`만 있음)
- `.gitignore`: 이미 `.env*.local` 포함 — 추가 작업 불필요

## 파일 구조 (최종)

| 경로 | 책임 | 만드는 Task |
|---|---|---|
| `supabase/migrations/0001_extensions_and_auth.sql` | pgcrypto extension + profiles 테이블 + handle_new_user 함수 + on_auth_user_created 트리거 | Task 4 |
| `supabase/migrations/0002_core_schema.sql` | 5테이블 (categories, payment_methods, fixed_expenses, transactions, monthly_summaries) + 4 인덱스 + touch_updated_at 함수 + 2 update 트리거 | Task 5 |
| `supabase/migrations/0003_rls_policies.sql` | 6테이블 RLS enable + 6개 FOR ALL 정책 | Task 6 |
| `supabase/migrations/0004_balance_cascade_trigger.sql` | recalc_monthly_summaries 함수 + transactions_recalc_trigger 함수 + trg_transactions_recalc 트리거 | Task 7 |
| `.env.local` | NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY (gitignored) | Task 3 |

총 5개 파일. 4개는 git에 커밋되고, `.env.local`은 gitignore.

---

## Task 1: Supabase 프로젝트 생성

**Files:** (없음 — MCP 호출만)

**작업 디렉토리:** `/Users/seungsoosmacbook/Desktop/seungsoo-life/`

- [ ] **Step 1: 기존 프로젝트 확인**

MCP 호출:
```
mcp__claude_ai_Supabase__list_projects
```

Expected: `{"projects": []}` — 비어 있어야 함. 만약 이미 `seungsoo-life` 프로젝트가 존재하면 Task 1 건너뛰고 Step 4로 직행해서 project_ref 받아오기.

- [ ] **Step 2: 비용 확인**

MCP 호출:
```
mcp__claude_ai_Supabase__get_cost
type: "project"
organization_id: "yayyvzxqfahwvjqzwbhf"
```

Expected: `amount: 0` (무료 티어). 만약 양수가 나오면 사용자에게 보고하고 진행 여부 확인 받기.

- [ ] **Step 3: 비용 승인**

MCP 호출:
```
mcp__claude_ai_Supabase__confirm_cost
type: "project"
recurrence: "monthly"
amount: 0
```

Expected: 응답에 `id` 필드 — 다음 step에서 `confirm_cost_id`로 사용.

- [ ] **Step 4: 프로젝트 생성**

MCP 호출:
```
mcp__claude_ai_Supabase__create_project
name: "seungsoo-life"
region: "ap-northeast-2"
organization_id: "yayyvzxqfahwvjqzwbhf"
confirm_cost_id: "<Step 3에서 받은 id>"
```

Expected: 응답에 `id` 또는 `ref` 필드 — 이것이 project ref. 생성에 30~90초 소요됨. 응답이 PENDING 상태일 수 있음.

- [ ] **Step 5: 프로젝트 ACTIVE 대기**

`list_projects` 또는 `get_project`로 status가 `ACTIVE_HEALTHY`가 될 때까지 polling (5초 간격, max 5분).

MCP 호출:
```
mcp__claude_ai_Supabase__get_project
id: "<Step 4의 project ref>"
```

Expected: `status: "ACTIVE_HEALTHY"`. 만약 5분 후에도 `INACTIVE` 또는 `INIT_FAILED`이면 STOP, 사용자에게 보고.

- [ ] **Step 6: URL + anon key 받기**

병렬 MCP 호출:
```
mcp__claude_ai_Supabase__get_project_url
project_id: "<project ref>"

mcp__claude_ai_Supabase__get_publishable_keys
project_id: "<project ref>"
```

Expected: URL은 `https://<ref>.supabase.co`, key는 `eyJ...` 형식. 다음 Task에서 `.env.local`에 사용. 사용자에게 두 값을 마스킹된 형태로 보고 (URL은 그대로, anon key는 앞 8자만).

---

## Task 2: Google OAuth 설정 (USER MANUAL — 일시 정지)

**Files:** (없음 — 외부 작업)

이 Task는 브라우저에서 사용자가 수동으로 진행. Implementer는 안내문 출력하고 사용자 완료 보고 기다림.

- [ ] **Step 1: 사용자에게 명확한 안내문 출력**

다음을 사용자에게 그대로 출력 (Task 1에서 받은 project ref를 `<REF>`에 치환):

```
🔴 USER PAUSE — Google OAuth 설정 (브라우저)

1단계: Google Cloud Console (https://console.cloud.google.com)
  a. 프로젝트 선택 (새로 만들거나 기존 거 사용)
  b. 좌측 메뉴 → APIs & Services → Credentials
  c. + CREATE CREDENTIALS → OAuth client ID
  d. Application type: Web application
  e. Name: "Seungsoo Life (Supabase)"
  f. Authorized redirect URIs에 추가:
     https://<REF>.supabase.co/auth/v1/callback
  g. CREATE → Client ID + Client Secret 받기 (둘 다 복사)

2단계: Supabase Dashboard
  a. https://supabase.com/dashboard/project/<REF>/auth/providers 접속
  b. Google provider 찾기 → Enable 토글 ON
  c. Client ID, Client Secret 붙여넣기
  d. Save

3단계: 완료 보고
  여기 채팅에 "Google OAuth 설정 끝" 같은 식으로 알려줘.
```

- [ ] **Step 2: 사용자 응답 대기**

사용자가 완료 보고할 때까지 진행하지 않음. 만약 사용자가 "어디가 안 보임" 같은 질문하면 친절히 안내. Task 3은 이게 끝나야 의미 있음 (.env.local만 만드는 거라 Auth 활성화 안 됐어도 환경은 동작하지만, Gate B 검증할 때 필요).

- [ ] **Step 3: 사용자 보고 후 다음 Task 진행 안내**

사용자 확인 받으면 "OK, Task 3 진행할게" 짧게 응답하고 Task 3으로.

**커밋 없음** (외부 변경, 로컬 파일 변경 없음)

---

## Task 3: `.env.local` 작성 + 게이트 A 검증

**Files:**
- Create: `.env.local` (gitignored, 커밋 안 됨)

**작업 디렉토리:** `/Users/seungsoosmacbook/Desktop/seungsoo-life/`

- [ ] **Step 1: `.env.local` 파일 생성**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://<REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key from Task 1 Step 6>
```

(`<REF>`와 `<anon-key>`는 Task 1 Step 6에서 받은 실제 값으로 치환)

- [ ] **Step 2: gitignore 확인**

Run:
```bash
cd /Users/seungsoosmacbook/Desktop/seungsoo-life
git check-ignore .env.local && echo "OK: .env.local is ignored"
git ls-files | grep "\.env\.local$"
```

Expected:
- 첫 명령: `.env.local` 출력 + `OK: .env.local is ignored`
- 둘째 명령: 빈 출력 (추적 안 됨)

만약 첫 명령이 실패 (exit 1)하면 STOP — `.gitignore`에 `.env*.local` 패턴 있는지 확인.

- [ ] **Step 3: 빌드 검증**

Run:
```bash
pnpm build 2>&1 | tail -10
```

Expected: `✓ Compiled successfully` + 4개 라우트 표시. 환경변수 없어도 빌드는 통과해야 함 (런타임 평가). 만약 빌드 실패면 STOP.

- [ ] **Step 4: dev 서버 게이트 A 검증**

Run (백그라운드):
```bash
cd /Users/seungsoosmacbook/Desktop/seungsoo-life
pnpm dev > /tmp/devserver.log 2>&1 &
DEV_PID=$!
sleep 6
```

검증:
```bash
curl -s -o /dev/null -w "%{http_code}\n" -L http://localhost:3000/
curl -s http://localhost:3000/budget | grep -c "가계부"
```

Expected:
- 첫 명령: `200` (redirect follow 후)
- 둘째 명령: 1 이상

종료:
```bash
kill $DEV_PID 2>/dev/null
sleep 1
```

`grep -n "error\|Error" /tmp/devserver.log` 실행해서 Supabase 관련 에러 메시지 없는지 확인. (다른 에러는 무시 — Phase 2부터 이미 있던 것들)

**커밋 없음** (`.env.local`은 gitignored)

---

## Task 4: 0001_extensions_and_auth.sql 작성 + apply

**Files:**
- Create: `supabase/migrations/0001_extensions_and_auth.sql`

- [ ] **Step 1: 디렉토리 생성**

Run:
```bash
mkdir -p /Users/seungsoosmacbook/Desktop/seungsoo-life/supabase/migrations
```

- [ ] **Step 2: 마이그레이션 파일 작성**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/supabase/migrations/0001_extensions_and_auth.sql`:

```sql
-- 0001_extensions_and_auth.sql
-- Auth-related bootstrap: extensions + profiles 미러 테이블 + auth.users INSERT 자동 처리

-- gen_random_uuid() 함수 활성화
create extension if not exists pgcrypto;

-- profiles: auth.users 미러 (앱 영역 FK 타깃)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Google OAuth 등으로 auth.users INSERT 시 자동으로 profiles row 생성
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

- [ ] **Step 3: Supabase에 apply**

MCP 호출:
```
mcp__claude_ai_Supabase__apply_migration
project_id: "<REF>"
name: "0001_extensions_and_auth"
query: <Step 2에서 작성한 SQL 전체 내용>
```

Expected: 에러 없이 적용. 응답이 정상 (객체) 반환.

만약 에러 시:
- "permission denied for schema auth" — `security definer` 누락 확인
- "relation auth.users does not exist" — 거의 발생 안 함, Supabase 기본 제공
- 기타 에러는 SQL 검토 후 재시도 또는 STOP

- [ ] **Step 4: 적용 검증**

MCP 호출:
```
mcp__claude_ai_Supabase__execute_sql
project_id: "<REF>"
query: |
  select
    (select count(*) from information_schema.tables
       where table_schema='public' and table_name='profiles') as profiles_table,
    (select count(*) from pg_proc
       where pronamespace='public'::regnamespace and proname='handle_new_user') as handle_new_user_fn,
    (select count(*) from pg_trigger
       where tgname='on_auth_user_created') as auth_trigger,
    (select count(*) from pg_extension where extname='pgcrypto') as pgcrypto_ext;
```

Expected: 결과 한 행, 4개 컬럼 모두 `1`. 어느 하나라도 0이면 마이그레이션 실패 — STOP.

- [ ] **Step 5: 커밋**

Run:
```bash
cd /Users/seungsoosmacbook/Desktop/seungsoo-life
git add supabase/migrations/0001_extensions_and_auth.sql
git commit -m "feat(db): 0001 extensions + profiles + handle_new_user 트리거 [ADR-004]"
```

ADR-004 태그는 PRD에 없던 `profiles` 미러 테이블 추가에 대한 추적.

---

## Task 5: 0002_core_schema.sql 작성 + apply

**Files:**
- Create: `supabase/migrations/0002_core_schema.sql`

- [ ] **Step 1: 마이그레이션 파일 작성**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/supabase/migrations/0002_core_schema.sql`:

```sql
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
```

- [ ] **Step 2: Supabase에 apply**

MCP 호출:
```
mcp__claude_ai_Supabase__apply_migration
project_id: "<REF>"
name: "0002_core_schema"
query: <Step 1에서 작성한 SQL 전체>
```

Expected: 정상 적용.

- [ ] **Step 3: 적용 검증 — 테이블 존재 확인**

MCP 호출:
```
mcp__claude_ai_Supabase__execute_sql
project_id: "<REF>"
query: |
  select table_name from information_schema.tables
   where table_schema='public'
     and table_name in (
       'profiles','categories','payment_methods',
       'fixed_expenses','transactions','monthly_summaries'
     )
   order by table_name;
```

Expected: 6 행 — `categories, fixed_expenses, monthly_summaries, payment_methods, profiles, transactions`.

- [ ] **Step 4: 적용 검증 — 인덱스 + 트리거 확인**

MCP 호출:
```
mcp__claude_ai_Supabase__execute_sql
project_id: "<REF>"
query: |
  select
    (select count(*) from pg_indexes
       where schemaname='public'
         and indexname in ('categories_user_parent_idx','fixed_expenses_user_active_idx',
                           'transactions_user_ym_idx','transactions_user_date_idx')) as indexes,
    (select count(*) from pg_trigger
       where tgname in ('trg_transactions_touch','trg_monthly_summaries_touch')) as touch_triggers,
    (select count(*) from pg_proc
       where pronamespace='public'::regnamespace and proname='touch_updated_at') as touch_fn;
```

Expected: `indexes=4, touch_triggers=2, touch_fn=1`. 다르면 STOP.

- [ ] **Step 5: 커밋**

Run:
```bash
cd /Users/seungsoosmacbook/Desktop/seungsoo-life
git add supabase/migrations/0002_core_schema.sql
git commit -m "feat(db): 0002 5테이블 + 인덱스 + touch trigger [ADR-005][ADR-006]"
```

ADR-005 = type 컬럼이 enum 아닌 text+CHECK. ADR-006 = monthly_summaries 복합 PK.

---

## Task 6: 0003_rls_policies.sql 작성 + apply

**Files:**
- Create: `supabase/migrations/0003_rls_policies.sql`

- [ ] **Step 1: 마이그레이션 파일 작성**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/supabase/migrations/0003_rls_policies.sql`:

```sql
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
```

- [ ] **Step 2: Supabase에 apply**

MCP 호출:
```
mcp__claude_ai_Supabase__apply_migration
project_id: "<REF>"
name: "0003_rls_policies"
query: <Step 1에서 작성한 SQL 전체>
```

Expected: 정상 적용.

- [ ] **Step 3: 적용 검증 — RLS + 정책 개수**

MCP 호출:
```
mcp__claude_ai_Supabase__execute_sql
project_id: "<REF>"
query: |
  select
    (select count(*) from pg_tables
       where schemaname='public'
         and tablename in ('profiles','categories','payment_methods',
                           'fixed_expenses','transactions','monthly_summaries')
         and rowsecurity=true) as rls_enabled_tables,
    (select count(*) from pg_policies
       where schemaname='public'
         and tablename in ('profiles','categories','payment_methods',
                           'fixed_expenses','transactions','monthly_summaries')
         and cmd='ALL') as for_all_policies;
```

Expected: `rls_enabled_tables=6, for_all_policies=6`. 다르면 STOP.

- [ ] **Step 4: 보안 advisor 체크**

MCP 호출:
```
mcp__claude_ai_Supabase__get_advisors
project_id: "<REF>"
type: "security"
```

Expected: `rls_disabled` 경고 0개. 다른 경고는 정보 표시 정도로 보고. 만약 RLS 관련 critical 경고가 있으면 STOP.

- [ ] **Step 5: 커밋**

Run:
```bash
cd /Users/seungsoosmacbook/Desktop/seungsoo-life
git add supabase/migrations/0003_rls_policies.sql
git commit -m "feat(db): 0003 RLS enable + FOR ALL 정책 6개 [ADR-007]"
```

ADR-007 = SELECT/INSERT/UPDATE/DELETE 분리 안 하고 FOR ALL 단일 정책.

---

## Task 7: 0004_balance_cascade_trigger.sql 작성 + apply

**Files:**
- Create: `supabase/migrations/0004_balance_cascade_trigger.sql`

- [ ] **Step 1: 마이그레이션 파일 작성**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/supabase/migrations/0004_balance_cascade_trigger.sql`:

```sql
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
```

- [ ] **Step 2: Supabase에 apply**

MCP 호출:
```
mcp__claude_ai_Supabase__apply_migration
project_id: "<REF>"
name: "0004_balance_cascade_trigger"
query: <Step 1에서 작성한 SQL 전체>
```

Expected: 정상 적용.

- [ ] **Step 3: 적용 검증 — 함수 + 트리거 존재**

MCP 호출:
```
mcp__claude_ai_Supabase__execute_sql
project_id: "<REF>"
query: |
  select
    (select count(*) from pg_proc
       where pronamespace='public'::regnamespace
         and proname='recalc_monthly_summaries') as recalc_fn,
    (select count(*) from pg_proc
       where pronamespace='public'::regnamespace
         and proname='transactions_recalc_trigger') as trigger_fn,
    (select count(*) from pg_trigger
       where tgname='trg_transactions_recalc') as cascade_trigger;
```

Expected: `recalc_fn=1, trigger_fn=1, cascade_trigger=1`. 다르면 STOP.

- [ ] **Step 4: 커밋**

Run:
```bash
cd /Users/seungsoosmacbook/Desktop/seungsoo-life
git add supabase/migrations/0004_balance_cascade_trigger.sql
git commit -m "feat(db): 0004 잔고 연쇄 갱신 트리거 (recalc_monthly_summaries)"
```

ADR 태그 없음 — PRD에 명시된 핵심 비즈니스 로직 구현이라 신규 결정 아님.

---

## Task 8: 게이트 B — 트리거로 profiles 자동 생성 검증

**Files:** (없음 — MCP 호출 + 사용자 수동)

`auth.users`는 시스템 테이블이라 직접 SQL INSERT가 어려움 (NOT NULL 필드 다수). Supabase 대시보드의 "Add user" 기능으로 테스트 user를 만들고, `handle_new_user` 트리거가 잘 동작하는지 확인.

- [ ] **Step 1: 사용자 안내 (USER PAUSE)**

다음을 사용자에게 출력 (`<REF>`를 실제 project ref로 치환):

```
🔴 USER PAUSE — 트리거 검증용 테스트 user 생성

1. https://supabase.com/dashboard/project/<REF>/auth/users 접속
2. 우측 상단 "+ Add user" 클릭
3. "Create new user" 선택
4. Email: your-real-email@example.com (실제 이메일 — Phase 4에서 Google OAuth 첫 로그인에 쓸 거)
5. Password: 임시 비밀번호 입력 (8자 이상)
6. "Auto Confirm User" 체크 (이메일 확인 건너뜀)
7. Create user 클릭

완료되면 채팅에 "test user 만듦"이라고 알려줘.
```

- [ ] **Step 2: 사용자 응답 대기**

사용자가 완료 보고할 때까지 진행하지 않음.

- [ ] **Step 3: profiles 자동 생성 확인**

MCP 호출:
```
mcp__claude_ai_Supabase__execute_sql
project_id: "<REF>"
query: |
  select p.id, u.email, p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
   order by p.created_at desc
   limit 5;
```

Expected: 최소 1행. 방금 만든 user의 email + profiles row가 같은 id로 존재.

만약 0행:
- `handle_new_user` 함수가 fire 안 됨 → 트리거 `tgenabled` 상태 확인:
  ```
  mcp__claude_ai_Supabase__execute_sql
  query: select tgname, tgenabled from pg_trigger where tgname='on_auth_user_created';
  ```
  `tgenabled`가 `'O'`(enabled)이어야 함.
- 또는 함수 권한 문제 — `handle_new_user`가 `security definer` 인지 확인.

검증 통과 시 user id를 메모해두기 — Task 9에서 `<UID>`로 사용.

- [ ] **Step 4: user id 기록**

사용자에게 보고:
```
✅ Gate B 통과: test user의 profiles row 자동 생성 확인됨.
   user_id: <UUID>
   (이 ID는 Task 9 잔고 시나리오에서 사용. Phase 4 첫 Google OAuth 로그인 시 이 user와는 별개의 새 user가 생기지만, 트리거 동작은 동일하게 검증됨.)
```

**커밋 없음** (검증만)

---

## Task 9: 게이트 C — 잔고 연쇄 트리거 SQL 시나리오 (T1~T5)

**Files:** (없음 — MCP 호출만)

Task 8에서 받은 `<UID>`를 Step 1~5에서 사용. 매 step 끝에 monthly_summaries 상태를 확인하고 기대값과 비교.

- [ ] **Step 1: T1 — 1월 입금 100,000 (paid)**

MCP 호출:
```
mcp__claude_ai_Supabase__execute_sql
project_id: "<REF>"
query: |
  insert into public.transactions
    (user_id, year_month, date, type, category_1st, amount, is_paid)
  values
    ('<UID>', '2026-01', '2026-01-05', 'income', '월급', 100000, true);

  select year_month, opening_balance, income_total, expense_total,
         paid_total, unpaid_total, current_balance, expected_balance
    from public.monthly_summaries
   where user_id='<UID>'
   order by year_month;
```

Expected (한 행):
```
year_month=2026-01, opening=0, income=100000, expense=0,
paid=0, unpaid=0, current=100000, expected=100000
```

기대값 불일치 시 STOP — 트리거 디버깅 필요.

- [ ] **Step 2: T2 — 1월 출금 30,000 (unpaid)**

MCP 호출:
```
mcp__claude_ai_Supabase__execute_sql
project_id: "<REF>"
query: |
  insert into public.transactions
    (user_id, year_month, date, type, category_1st, amount, is_paid)
  values
    ('<UID>', '2026-01', '2026-01-10', 'expense', '식비', 30000, false);

  select year_month, opening_balance, income_total, expense_total,
         paid_total, unpaid_total, current_balance, expected_balance
    from public.monthly_summaries
   where user_id='<UID>'
   order by year_month;
```

Expected (한 행):
```
year_month=2026-01, opening=0, income=100000, expense=30000,
paid=0, unpaid=30000, current=100000, expected=70000
```

- [ ] **Step 3: T3 — 2월 출금 50,000 (paid)**

MCP 호출:
```
mcp__claude_ai_Supabase__execute_sql
project_id: "<REF>"
query: |
  insert into public.transactions
    (user_id, year_month, date, type, category_1st, amount, is_paid)
  values
    ('<UID>', '2026-02', '2026-02-01', 'expense', '교통', 50000, true);

  select year_month, opening_balance, income_total, expense_total,
         paid_total, unpaid_total, current_balance, expected_balance
    from public.monthly_summaries
   where user_id='<UID>'
   order by year_month;
```

Expected (두 행):
```
2026-01: opening=0, income=100000, expense=30000, paid=0, unpaid=30000, current=100000, expected=70000  (변동 없음)
2026-02: opening=100000, income=0, expense=50000, paid=50000, unpaid=0, current=50000, expected=50000
```

- [ ] **Step 4: T4 — 1월 unpaid → paid 토글 (cascade 핵심)**

MCP 호출:
```
mcp__claude_ai_Supabase__execute_sql
project_id: "<REF>"
query: |
  update public.transactions
     set is_paid = true
   where user_id='<UID>'
     and year_month='2026-01'
     and category_1st='식비';

  select year_month, opening_balance, income_total, expense_total,
         paid_total, unpaid_total, current_balance, expected_balance
    from public.monthly_summaries
   where user_id='<UID>'
   order by year_month;
```

Expected (두 행 — **2월이 자동 갱신**):
```
2026-01: opening=0, income=100000, expense=30000, paid=30000, unpaid=0, current=70000, expected=70000
2026-02: opening=70000, income=0, expense=50000, paid=50000, unpaid=0, current=20000, expected=20000  ← cascade 작동
```

만약 2월 값이 갱신 안 됐다면 (예: opening=100000 유지) — `transactions_recalc_trigger`의 `least(new.year_month, old.year_month)` 또는 `recalc_monthly_summaries` 순회 로직 문제. STOP.

- [ ] **Step 5: T5 — cleanup**

MCP 호출:
```
mcp__claude_ai_Supabase__execute_sql
project_id: "<REF>"
query: |
  delete from public.transactions where user_id='<UID>';
  delete from public.monthly_summaries where user_id='<UID>';

  select
    (select count(*) from public.transactions where user_id='<UID>') as t_count,
    (select count(*) from public.monthly_summaries where user_id='<UID>') as s_count;
```

Expected: `t_count=0, s_count=0`.

5개 step 모두 기대값 일치하면 ✅ 게이트 C 통과.

**커밋 없음** (검증만)

---

## Task 10: Final verification + ADR 알림

**Files:** (없음 — 확인만)

- [ ] **Step 1: 빌드/린트/타입체크**

Run:
```bash
cd /Users/seungsoosmacbook/Desktop/seungsoo-life
pnpm build 2>&1 | tail -5
echo "---"
pnpm lint 2>&1 | tail -3
echo "---"
pnpm exec tsc --noEmit 2>&1 | tail -3
echo "TSC EXIT: $?"
```

Expected: 세 가지 모두 통과. (Phase 3은 SQL 변경만이라 TypeScript 영향 없음)

- [ ] **Step 2: git 상태 확인**

Run:
```bash
cd /Users/seungsoosmacbook/Desktop/seungsoo-life
git status --short
git log --oneline -10
git ls-files supabase/migrations/
git ls-files | grep "\.env\.local$" ; echo "(empty = .env.local correctly not tracked)"
```

Expected:
- `git status --short`: 빈 출력 (working tree clean)
- `git log`: 최근 4개 커밋이 0001~0004 마이그레이션
- `supabase/migrations/` 아래 4개 파일
- `.env.local`은 추적 안 됨

- [ ] **Step 3: Supabase 상태 최종 확인**

MCP 호출:
```
mcp__claude_ai_Supabase__list_migrations
project_id: "<REF>"
```

Expected: 4개 마이그레이션 (`0001_extensions_and_auth`, `0002_core_schema`, `0003_rls_policies`, `0004_balance_cascade_trigger`).

```
mcp__claude_ai_Supabase__list_tables
project_id: "<REF>"
schemas: ["public"]
```

Expected: 6 테이블 (profiles, categories, payment_methods, fixed_expenses, transactions, monthly_summaries).

```
mcp__claude_ai_Supabase__get_advisors
project_id: "<REF>"
type: "security"
```

Expected: critical 경고 0개. (info-level 경고는 OK)

- [ ] **Step 4: ADR 알림 출력**

사용자에게 다음 메시지 출력:

```
🎉 Phase 3 완료.

✅ 게이트 A: Supabase 연결 OK
✅ 게이트 B: handle_new_user 트리거 → profiles 자동 생성 확인
✅ 게이트 C: 잔고 연쇄 트리거 T1~T5 시나리오 모두 통과

⚠️ Notion 업데이트 필요 — ADR 4건 (가계부 모듈 페이지 §14 누적)

ADR-004: profiles 미러 테이블 추가
- 일자: 2026-05-28
- 결정: PRD에 명시되지 않은 public.profiles 테이블 추가 (auth.users(id) FK 미러)
- 이유: 앱 영역 테이블이 auth.users에 직접 FK 거는 것보다 권장 패턴. 향후 display_name/currency 등 앱 전용 컬럼 확장 여지 확보.
- 영향: 0001 마이그레이션 (profiles + 자동 생성 트리거), 모든 user_id FK 타깃이 profiles.id

ADR-005: type 컬럼이 PostgreSQL enum 아닌 text + CHECK
- 일자: 2026-05-28
- 결정: PRD가 "enum: income, expense"로 명시한 것을 text + CHECK 제약으로 구현
- 이유: PostgreSQL enum의 alter type 작업이 복잡. text + check가 마이그레이션 친화적
- 영향: categories.type, fixed_expenses.type, transactions.type 세 컬럼

ADR-006: monthly_summaries PK = (user_id, year_month) 복합키
- 일자: 2026-05-28
- 결정: PRD의 "id uuid + year_month unique" 대신 (user_id, year_month) 복합 PK 사용 (id 컬럼 없음)
- 이유: UPSERT 단순화. 자연키로 충분. 인덱스 1개 절약.
- 영향: monthly_summaries 테이블 구조, 트리거의 ON CONFLICT 절

ADR-007: RLS 정책 FOR ALL 단일 정책
- 일자: 2026-05-28
- 결정: 각 테이블 RLS를 SELECT/INSERT/UPDATE/DELETE 4정책으로 쪼개지 않고 FOR ALL 단일 정책으로 통일
- 이유: 1인 프로젝트에서 정책이 모두 동일 (user_id = auth.uid()). 4정책 분리 시 코드만 길어짐
- 영향: 0003 마이그레이션, 향후 권한 확장 시 (예: 가족 공유 모드) 4정책으로 재작성 필요
```

**커밋 없음** (확인 단계)

---

## Final Verification Summary

모든 Task 완료 후 다음 상태가 보장됨:

- [ ] Supabase 프로젝트 `seungsoo-life` 생성 (region ap-northeast-2, status ACTIVE_HEALTHY)
- [ ] Google OAuth provider 활성화 (Supabase dashboard)
- [ ] `.env.local` 작성 (gitignored)
- [ ] 4개 마이그레이션 파일 git에 커밋 + Supabase에 적용
- [ ] 6테이블 public 스키마에 존재
- [ ] 모든 6테이블 RLS enable + FOR ALL 정책
- [ ] handle_new_user 트리거로 auth.users → profiles 자동 동기화 (게이트 B 통과)
- [ ] transactions 트리거로 잔고 연쇄 갱신 (게이트 C T1~T5 모두 기대값)
- [ ] pnpm build / lint / tsc 모두 통과
- [ ] git working tree clean
- [ ] ADR-004 ~ ADR-007 사용자에게 보고됨

---

## 트러블슈팅

**create_project가 PENDING에서 안 넘어감:**
- 5분 polling 후에도 ACTIVE 아니면 Supabase 상태 페이지 확인 (status.supabase.com). 일시적 outage 가능.
- 또는 region 변경 후 재시도 (Tokyo `ap-northeast-1`).

**apply_migration이 "transaction" 관련 에러:**
- Supabase MCP의 apply_migration은 transaction wrap. DDL 일부가 transaction 밖에서만 가능할 수도 (드물지만). 그 경우 단일 statement로 분할 후 execute_sql로 적용.

**handle_new_user 트리거가 fire 안 함:**
- `security definer` 누락 → 함수 권한 부족으로 silent fail. 재apply.
- `set search_path = public` 누락 → `profiles` 찾기 실패. 재apply.
- `tgenabled` 상태 확인 (`select tgname, tgenabled from pg_trigger where tgname='on_auth_user_created'` → `'O'`이어야 enabled).

**recalc_monthly_summaries cascade 안 됨 (T4에서 2월 갱신 안 됨):**
- `least(new.year_month, old.year_month)` 로직 확인
- 함수 내 `for v_year_month in ... order by ym` 정렬 확인 (오름차순 필수)
- `on conflict` 절의 컬럼 매칭 확인

**RLS 정책이 막아서 트리거가 INSERT 못함:**
- 트리거 함수가 `security definer` 필수. `recalc_monthly_summaries`에 이 attribute 있는지 확인.
- `set search_path = public` 도 필요 (search_path 안 정해주면 권한 우회 위험으로 거부될 수 있음).

**테스트 user 만들었는데 profiles에 row 없음:**
- 트리거 함수 에러로 silent fail 가능. Supabase dashboard → Logs → Postgres logs 확인.
- 또는 MCP `get_logs project_id=<REF> service=postgres`로 최근 에러 확인.

---

## 의도적으로 안 함 (이 plan의 범위 밖)

- 가계부 UI (Phase 4)
- TypeScript 타입 생성 (`generate_typescript_types`) → Phase 4 첫 step
- 시드 카테고리/결제수단 데이터 → Phase 4 설정 UI에서 입력
- pgTAP / Vitest 테스트 프레임워크 도입 → 브레인스토밍에서 SQL 수동으로 결정
- 마이그레이션 down script → Supabase forward-only 권장
- 5년 엑셀 import → Phase 5+
- Realtime / Edge Functions → YAGNI
