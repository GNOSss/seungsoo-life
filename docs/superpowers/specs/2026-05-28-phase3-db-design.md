# Phase 3 — DB 백엔드 인프라 설계 (Design Spec)

> 일자: 2026-05-28
> 프로젝트: 승수 라이프 (통합 PWA) — 가계부 모듈
> 단계: Phase 3 (Supabase 프로젝트 + 스키마 + RLS + 잔고 연쇄 트리거)
> 관련 PRD:
> - 마스터플랜: https://www.notion.so/35acf376124680498e8ecca4a28566f3
> - 가계부 모듈 PRD: https://www.notion.so/36dcf376124681d1aed1cc5f7212ab2f

---

## 1. 목적과 범위

Phase 3의 단일 목표: **가계부 UI(Phase 4)가 작동할 수 있는 백엔드 인프라를 완성한다.**

완료 시점: Google 로그인 + 빈 DB(스키마/RLS/트리거 적용) + Phase 4용 TypeScript 클라이언트가 환경변수로 정상 연결 + 핵심 비즈니스 로직(잔고 연쇄 갱신)이 SQL로 검증됨.

**브레인스토밍 결과 확정 사항**:
- 스코프: 한 덩어리 (Supabase 생성 + Auth + 5테이블 + RLS + 트리거 일괄)
- Supabase: 원격 프로젝트 직접 (Docker/CLI 사용 안 함, MCP `apply_migration`만)
- Auth: Google OAuth
- 트리거 검증: SQL 수동 (별도 테스트 프레임워크 없음)
- 조직: 기존 `SEUNGSOO` Supabase org
- Region: `ap-northeast-2` (Seoul)

## 2. 기술 스택 (확정)

| 항목 | 확정 |
|---|---|
| DB | Supabase Postgres (원격, region ap-northeast-2) |
| Auth | Supabase Auth + Google OAuth provider |
| 마이그레이션 | SQL 파일 + Supabase MCP `apply_migration` |
| 검증 | SQL 수동 시나리오 (pgTAP / Vitest 없음) |
| 로컬 환경 | 없음 (Docker / supabase CLI 사용 X) |

이미 Phase 2에서 설치된 `@supabase/supabase-js`, `@supabase/ssr`을 그대로 사용.

## 3. 폴더 구조 (최종 상태)

```
seungsoo-life/
├── supabase/                              ← 신규 (이번 단계)
│   └── migrations/                        ← 신규
│       ├── 0001_extensions_and_auth.sql
│       ├── 0002_core_schema.sql
│       ├── 0003_rls_policies.sql
│       └── 0004_balance_cascade_trigger.sql
├── .env.local                             ← 신규 (gitignore, 직접 작성)
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-05-28-phase3-db-design.md  ← 이 문서
├── lib/supabase/                          (Phase 2에서 작성 완료, 변경 없음)
└── (나머지는 Phase 2 그대로)
```

## 4. DB 스키마 명세

### 4.1 테이블 (6개)

각 테이블의 책임 + 핵심 컬럼. 정확한 DDL은 §5의 마이그레이션 파일에.

**profiles** — `auth.users` 미러
- **책임**: 앱 영역에서 FK 타깃으로 쓸 사용자 식별자. Google OAuth 첫 로그인 시 자동 생성됨 (트리거).
- **핵심 컬럼**: `id uuid pk references auth.users(id) on delete cascade`
- **확장 여지**: 향후 `display_name`, `currency`, `timezone` 추가 가능 (Phase 3에선 추가 안 함)

**categories** — 1차/2차 카테고리 (드롭다운용)
- **책임**: 거래 입력 시 드롭다운에 제공할 카테고리 목록. **거래 행에는 값이 스냅샷으로 복사됨** — 이 테이블 수정해도 과거 거래 영향 없음.
- **핵심 컬럼**: `parent_id` (self-FK, null=1차), `name`, `type (income|expense)`, `sort_order`
- **인덱스**: `(user_id, parent_id)`

**payment_methods** — 결제수단 (드롭다운용)
- **책임**: 거래 입력 시 "구분" 드롭다운에 제공. 스냅샷 패턴 동일.
- **핵심 컬럼**: `name`, `sort_order`, `active boolean`

**fixed_expenses** — 고정지출 템플릿
- **책임**: 매월 자동 입력될 고정 거래 템플릿. "다음 월 생성" 버튼 클릭 시 앱이 이 템플릿을 읽어서 `transactions`에 INSERT.
- **핵심 컬럼**: `day_of_month (1-31)`, `category_1st/2nd`, `payment_method`, `amount`, `active`
- **인덱스**: `(user_id, active)`

**transactions** — 거래 (앱의 메인 테이블)
- **책임**: 모든 입출금 행. **스냅샷 패턴 절대 준수** — `category_1st`/`category_2nd`/`payment_method`는 FK 아닌 `text` 값 복사.
- **핵심 컬럼**: `year_month text (^\d{4}-\d{2}$)`, `date`, `type`, 스냅샷 3개, `amount`, `is_paid`, `is_fixed`, `created_at`, `updated_at`
- **인덱스**: `(user_id, year_month)`, `(user_id, date)`
- **트리거**: `touch_updated_at` (BEFORE UPDATE), `transactions_recalc_trigger` (AFTER INSERT/UPDATE/DELETE)

**monthly_summaries** — 월별 요약 (트리거 관리, 캐시 성격)
- **책임**: 각 월의 7개 잔고/총액 지표를 보관. 앱은 이 테이블만 읽으면 대시보드 그릴 수 있음. 트리거가 자동 갱신.
- **PK**: `(user_id, year_month)` 복합키
- **컬럼**: `opening_balance`, `income_total`, `expense_total`, `paid_total`, `unpaid_total`, `current_balance`, `expected_balance`, `updated_at`
- **트리거**: `touch_updated_at` (BEFORE UPDATE)

### 4.2 핵심 결정 (PRD에 없거나 다른 사항 — ADR 대상)

| ID | 결정 | 이유 |
|---|---|---|
| ADR-004 | `public.profiles` 미러 테이블 추가 | auth.users 직접 FK보다 권장 패턴. 향후 앱 전용 컬럼 확장 여지 |
| ADR-005 | `type` 컬럼이 PostgreSQL enum 아닌 `text + CHECK` | enum alter가 복잡. text+check가 마이그레이션 친화적 |
| ADR-006 | `monthly_summaries` PK = `(user_id, year_month)` 복합키 | PRD의 `id uuid + unique` 대신. UPSERT 단순화 |
| ADR-007 | RLS 정책 `FOR ALL` 단일 정책 | 1인 프로젝트에서 SELECT/INSERT/UPDATE/DELETE 분리 불필요 |

### 4.3 일부러 안 만든 컬럼 (YAGNI)

- `currency` (KRW 단일)
- `transactions.deleted_at` (soft delete 안 함)
- `categories.icon` / `categories.color` (UI는 텍스트만)
- `fixed_expenses.next_run_at` 캐시 (매번 day_of_month로 계산)
- `audit_log` 테이블

## 5. 마이그레이션 명세

각 파일의 정확한 DDL은 구현 시 `docs/superpowers/plans/`에 별도 작성됨. 여기서는 책임만.

### 5.1 `0001_extensions_and_auth.sql`

Auth-related 모든 것을 한 파일에 모음 — `handle_new_user()` 함수가 `public.profiles`를 참조하므로 profiles 테이블도 여기서 같이 생성 (PostgreSQL `check_function_bodies` 기본 on에서 함수 생성 시 참조 테이블 존재 필수).

- `create extension if not exists pgcrypto;` — `gen_random_uuid()`용
- `public.profiles` 테이블 (id uuid pk references auth.users(id) on delete cascade, created_at)
- `public.handle_new_user()` PL/pgSQL 함수 (`security definer`) — `auth.users` INSERT 시 `public.profiles` row 자동 생성
- `on_auth_user_created` 트리거 — `after insert on auth.users` 바인딩

### 5.2 `0002_core_schema.sql`

- 5개 테이블 DDL (categories, payment_methods, fixed_expenses, transactions, monthly_summaries)
- 인덱스 4개 (`categories(user_id, parent_id)`, `fixed_expenses(user_id, active)`, `transactions(user_id, year_month)`, `transactions(user_id, date)`)
- `public.touch_updated_at()` 함수
- `trg_transactions_touch`, `trg_monthly_summaries_touch` (BEFORE UPDATE)
- 모든 FK는 `on delete cascade` (user_id FK는 profiles(id) 참조)
- `type` 컬럼은 `text not null check (type in ('income','expense'))`
- `year_month`는 `text not null check (year_month ~ '^\d{4}-\d{2}$')`
- `amount`는 `numeric(14,2)`

### 5.3 `0003_rls_policies.sql`

- 6테이블 모두 `alter table ... enable row level security`
- 6개 정책 (profiles는 `id = auth.uid()`, 나머지 5개는 `user_id = auth.uid()`)
- 모든 정책 `for all using (...) with check (...)` — using과 with check 둘 다 명시 (INSERT 시 user_id 위조 방지)

### 5.4 `0004_balance_cascade_trigger.sql`

- `public.recalc_monthly_summaries(p_user_id uuid, p_from_year_month text)` 함수 (`security definer`)
  - `transactions` UNION `monthly_summaries` 의 distinct year_month 집합을 `>= p_from_year_month` 조건으로 오름차순 순회
  - 각 월: 직전 월 `current_balance` 가져오기 → 이번 월 transactions 합산 → UPSERT
- `public.transactions_recalc_trigger()` 트리거 함수
  - INSERT → `new.year_month`
  - DELETE → `old.year_month`
  - UPDATE → `least(new.year_month, old.year_month)`
- `trg_transactions_recalc` (AFTER INSERT/UPDATE/DELETE on transactions, FOR EACH ROW)

## 6. Auth + 환경 셋업

### 6.1 Supabase 프로젝트 생성 (MCP)

- 조직: `SEUNGSOO` (기존, slug `yayyvzxqfahwvjqzwbhf`)
- 프로젝트명: `seungsoo-life`
- region: `ap-northeast-2` (Seoul)
- 비용 확인: MCP `get_cost` 호출 → 무료 티어 (월 0달러) 확인 후 `confirm_cost` → `create_project`

### 6.2 Google OAuth 셋업 (사용자 수동 작업)

마이그레이션과 별개로 브라우저에서 진행:

1. **Google Cloud Console** (`console.cloud.google.com`)
   - 새 프로젝트 또는 기존 프로젝트 선택
   - APIs & Services → Credentials → Create OAuth client ID
   - Application type: Web application
   - Authorized redirect URIs: `https://<supabase-project-ref>.supabase.co/auth/v1/callback`
   - client_id + client_secret 받기

2. **Supabase Dashboard** (`supabase.com/dashboard/project/<ref>/auth/providers`)
   - Google provider Enable
   - Client ID, Client Secret 입력
   - Save

3. **검증**: Phase 4 UI 진입 전, 임시로 로컬에서 `pnpm dev` + 간단한 signin 호출로 1회 로그인 시도. 성공 후 `select * from public.profiles` → 1 row 존재 확인.

### 6.3 `.env.local` 작성

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

URL과 anon key는 MCP `get_project_url` + `get_publishable_keys`로 받음. `.gitignore`에 이미 `.env*.local` 포함됨.

## 7. 검증 시나리오

### 7.1 게이트 A — Supabase 연결
- `.env.local` 작성 후 `pnpm dev` → 브라우저에서 `/budget` 접속 → 콘솔 에러 없음

### 7.2 게이트 B — Auth + Profile 자동 생성
- Google 로그인 1회 성공
- MCP `execute_sql`로 `select * from public.profiles` → 본인 row 1개 존재
- 만약 row 없으면 `handle_new_user` 트리거 디버깅

### 7.3 게이트 C — 잔고 연쇄 트리거 (5단계 SQL 시나리오)

본인 user_id를 `<UID>`로 치환해서 순서대로 실행. 각 단계 후 `select * from monthly_summaries where user_id='<UID>' order by year_month` 결과를 기대값과 비교.

**T1: 1월 입금 100,000 (paid)**
```sql
insert into transactions (user_id, year_month, date, type, category_1st, amount, is_paid)
  values ('<UID>', '2026-01', '2026-01-05', 'income', '월급', 100000, true);
```
기대: `2026-01 → opening=0, income=100000, expense=0, paid=0, unpaid=0, current=100000, expected=100000`

**T2: 1월 출금 30,000 (unpaid)**
```sql
insert into transactions (user_id, year_month, date, type, category_1st, amount, is_paid)
  values ('<UID>', '2026-01', '2026-01-10', 'expense', '식비', 30000, false);
```
기대: `2026-01 → income=100000, expense=30000, paid=0, unpaid=30000, current=100000, expected=70000`

**T3: 2월 출금 50,000 (paid)**
```sql
insert into transactions (user_id, year_month, date, type, category_1st, amount, is_paid)
  values ('<UID>', '2026-02', '2026-02-01', 'expense', '교통', 50000, true);
```
기대:
- `2026-01 → 변동 없음`
- `2026-02 → opening=100000, income=0, expense=50000, paid=50000, unpaid=0, current=50000, expected=50000`

**T4: 1월 unpaid → paid 토글 (연쇄 갱신 핵심)**
```sql
update transactions set is_paid = true
  where user_id='<UID>' and year_month='2026-01' and category_1st='식비';
```
기대 (cascade):
- `2026-01 → paid=30000, unpaid=0, current=70000, expected=70000`
- `2026-02 → opening=70000, current=20000, expected=20000` ← **자동 갱신 확인!**

**T5: cleanup**
```sql
delete from transactions where user_id='<UID>';
delete from monthly_summaries where user_id='<UID>';
```
기대: 두 테이블 모두 본인 user_id 행 0개

세 게이트 (A, B, C) 모두 통과해야 Phase 3 완료.

## 8. 실행 순서 (10단계)

| # | 단계 | 도구 | 산출물 |
|---|---|---|---|
| 1 | Supabase 프로젝트 생성 | MCP `get_cost` → `confirm_cost` → `create_project` | project ref, URL, anon key |
| 2 | Google Cloud OAuth client 생성 | 사용자 수동 (브라우저) | client_id + secret |
| 3 | Supabase Dashboard → Google provider 활성화 | 사용자 수동 (브라우저) | Google 로그인 가능 상태 |
| 4 | `.env.local` 작성 | 로컬 파일 | 환경변수 셋업 |
| 5 | `supabase/migrations/` 디렉토리 생성 | 파일 시스템 | 빈 디렉토리 |
| 6 | `0001_extensions_and_auth.sql` 작성 + apply | MCP `apply_migration` | extensions + profiles + handle_new_user 트리거 |
| 7 | `0002_core_schema.sql` 작성 + apply | MCP `apply_migration` | 5테이블 + 인덱스 + touch trigger |
| 8 | `0003_rls_policies.sql` 작성 + apply | MCP `apply_migration` | RLS + 6정책 |
| 9 | `0004_balance_cascade_trigger.sql` 작성 + apply | MCP `apply_migration` | recalc 함수 + transactions trigger |
| 10 | 게이트 A/B/C 검증 + 커밋 | 사용자 + MCP `execute_sql` | Phase 3 완료 |

각 마이그레이션 작성 + apply 후 git commit. Phase 2 패턴 그대로.

## 9. Phase 3 완료 정의 (Definition of Done)

- [ ] Supabase 프로젝트 `seungsoo-life` 생성됨 (region: ap-northeast-2)
- [ ] `.env.local`에 URL + anon key 채워짐 (커밋 안 됨)
- [ ] `supabase/migrations/` 디렉토리에 4개 파일 존재 + 모두 Supabase에 적용됨
- [ ] Google OAuth 로그인 1회 성공 → `profiles` 자동 생성됨 (게이트 B)
- [ ] 트리거 검증 SQL T1~T5 전부 기대값 일치 (게이트 C)
- [ ] `pnpm build`, `pnpm lint`, `pnpm exec tsc --noEmit` 모두 통과
- [ ] git working tree clean
- [ ] ADR-004 ~ ADR-007 사용자에게 보고 (Notion 업데이트 요청)

## 10. ADR 알림 (Phase 3 종료 시 사용자에게 보고할 내용)

CLAUDE.md의 "DB 스키마 변경 = ADR 필수" 규칙에 따라 다음을 Notion 가계부 모듈 페이지 §14에 추가해야 함:

```
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

## 11. 의도적으로 안 하는 것 (YAGNI / 후속 Phase)

- ❌ 가계부 UI (설정 화면, 거래 입력, 월별 페이지) — Phase 4
- ❌ TypeScript 타입 생성 (`generate_typescript_types`) — Phase 4 첫 step
- ❌ 5년치 엑셀 import (CSV/XLSX) — Phase 5+ (PRD에서 별도 Phase로 명시)
- ❌ 시드 카테고리/결제수단 — 사용자가 Phase 4 설정 UI에서 입력 또는 마지막 일괄 import
- ❌ 백업 자동화 검증 — Phase 6
- ❌ 일기장 / 운동기록 DB — 별도 모듈
- ❌ Realtime / Edge Functions — 1인용에 불필요
- ❌ pgTAP / Vitest 테스트 프레임워크 — SQL 수동 검증으로 충분 (브레인스토밍 결정)
- ❌ 마이그레이션 down script — Supabase forward-only 권장, 1인이라 더더욱
- ❌ 트리거 비활성화 옵션 (bulk import용) — Phase 5 엑셀 import 시점에 필요하면 추가
- ❌ 디퍼드 트리거 (constraint trigger) — 1인 환경에서 과한 최적화
