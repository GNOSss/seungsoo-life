# Phase 4b-2 — 거래 입력 + 정렬 + 월별 요약 + 고정지출 자동 INSERT 설계 (Design Spec)

> 일자: 2026-05-30
> 프로젝트: 승수 라이프 (통합 PWA) — 가계부 모듈
> 단계: Phase 4b-2 (가계부 MVP 완성 — 거래 CRUD + 정렬 + 7 지표 + 다음 월 생성 고정지출 자동)
> 관련 PRD:
> - 마스터플랜: https://www.notion.so/35acf376124680498e8ecca4a28566f3
> - 가계부 모듈 PRD: https://www.notion.so/36dcf376124681d1aed1cc5f7212ab2f
> Phase 4 분할: 4a (완료) → 4b-1 (완료) → 4b-2 (이 문서) → 4c (대시보드 차트)

---

## 1. 목적과 범위

Phase 4b-2의 단일 목표: **가계부 MVP 완성 — 사용자가 일상에서 거래를 입력하고 잔고/요약을 확인하는 모든 흐름을 일상 사용 가능한 상태로 만든다.**

완료 시점: 거래 인라인 입력 (출금/입금 좌우 두 테이블, 7 컬럼, 키보드 중심) + 정렬 규칙 (고정 위/비고정 아래) + 월별 요약 7개 지표 표시 + "다음 월 생성" 시 active 고정지출 자동 INSERT.

**브레인스토밍 결과 확정 사항** (2026-05-30):
- Phase 4b-2 = 한 덩어리 spec/plan
- 입금/출금: 좌(출금)/우(입금) 두 별도 테이블 (PRD §7.5 명세)
- 거래 컬럼 라벨 변경: "구분" → "결제수단", "상세" → "비고", "여부" → "결제여부" (ADR-013, Phase 4a 고정지출 설정 라벨도 통일)
- 인라인 편집 패턴: Phase 4a/4b-1 그대로 (Tab/Enter/Esc/blur, 자동 저장)
- 정렬 규칙: PRD §6 명세대로 (고정→1차/2차/날짜, 비고정→날짜) + 정렬 옵션 UI 없음 (PRD MVP 제외)
- 월별 요약: 7 카드 grid, 가계부 흐름 순서 (전월→입금→출금→실제→남은→현재→예상), 음수 빨강
- 다음 월 생성 시 active 고정지출 자동 INSERT (`is_fixed=true, is_paid=false`), day_of_month clamp to 그 달 마지막 날

**범위 안**: 거래 CRUD, 정렬, 7 지표 표시, createNextMonth 확장, Phase 4a 라벨 통일.

**범위 밖** (4c/5+): 대시보드 차트, 엑셀 import, 자동완성, 검색/필터, 백업.

## 2. 기술 스택 (4b-2에서 사용)

| 항목 | 사용 |
|---|---|
| Server Actions | Phase 4a 패턴 (`AuthedClient` discriminated union, Zod) |
| 정렬 | `Intl.Collator("ko-KR")` (한글 가나다 안정 정렬) |
| 통화 표기 | `Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" })` |
| 인라인 편집 | Phase 4a `FixedExpenseRow` 패턴 그대로 (useTransition + blur 자동 저장) |
| 트리거 cascade | Phase 3 `trg_transactions_recalc` 자동 활용 |

**신규 의존성 없음.**

## 3. 폴더 구조 (Phase 4b-2 종료 시)

```
seungsoo-life/
├── app/
│   ├── budget/
│   │   ├── [ym]/
│   │   │   └── page.tsx                                ← 수정 (MonthHeader 단순 → MonthlySummary + TransactionGroups)
│   │   ├── settings/                                   ← Phase 4a (라벨 변경: 구분/상세/여부 → 결제수단/비고/결제여부)
│   │   └── (나머지 4b-1 그대로)
├── components/
│   ├── budget/
│   │   ├── month/                                      ← 신규 디렉토리
│   │   │   ├── MonthlySummary.tsx                      ← 신규 (server, 7 카드)
│   │   │   ├── SummaryCard.tsx                         ← 신규 (server, 한 카드)
│   │   │   ├── TransactionGroups.tsx                   ← 신규 (client, 좌/우 두 그룹 래퍼)
│   │   │   ├── TransactionTable.tsx                    ← 신규 (client, 한 그룹: 정렬 + 행 렌더)
│   │   │   ├── TransactionRow.tsx                      ← 신규 (client, 7 셀 인라인 편집)
│   │   │   └── TransactionAddRow.tsx                   ← 신규 (client, + 새 행)
│   │   ├── sidebar/                                    ← 4b-1 (변경 없음)
│   │   └── settings/                                   ← 4a (FixedExpenseTable 헤더만 라벨 통일)
├── lib/
│   ├── actions/
│   │   ├── transactions.ts                             ← 신규 (4 server actions)
│   │   ├── budget-months.ts                            ← 수정 (createNextMonth 확장: 고정지출 자동 INSERT)
│   │   └── (나머지 그대로)
│   ├── validators/
│   │   ├── transactions.ts                             ← 신규 (Zod schemas)
│   │   └── (나머지 그대로)
│   └── utils/
│       ├── ym.ts                                       ← 수정 (`lastDayOfMonth`, `ymWithDay` 추가)
│       ├── transactions-sort.ts                        ← 신규 (정렬 함수)
│       └── (cn 등 그대로)
```

총 신규 9 파일 + 수정 4 파일.

## 4. 라우팅 명세

기존 `app/budget/[ym]/page.tsx` (Phase 4b-1)는 그대로 유지. 내부 분기만 확장:
- `if (!summary)` → `NoMonthYet` (Phase 4b-1과 동일)
- `else` → `<MonthlySummary summary={summary} /> + <TransactionGroups transactions categories paymentMethods ym />` (4b-2 신규)

데이터 fetch 흐름:
```ts
// app/budget/[ym]/page.tsx
const [
  { data: summary },
  { data: transactions },
  { data: categories },
  { data: paymentMethods },
] = await Promise.all([
  supabase.from("monthly_summaries").select("*").eq("year_month", params.ym).maybeSingle(),
  supabase.from("transactions").select("*").eq("year_month", params.ym),
  supabase.from("categories").select("id, name, type, parent_id"),
  supabase.from("payment_methods").select("id, name").eq("active", true),
])
```

`Promise.all`로 4개 쿼리 병렬. summary 없으면 NoMonthYet 분기.

## 5. 거래 입력 인라인 테이블 명세

### 5.1 데스크탑 레이아웃

```
┌────────────────────────────────────────────────────────────────────────┐
│ 2026년 5월                                                              │
│ ┌─ 월별 요약 7 카드 (전월→입금→출금→실제→남은→현재→예상) ─┐         │
│ └──────────────────────────────────────────────────────────┘            │
│                                                                        │
│ ┌──── 💸 출금 ────┐  ┌──── 💰 입금 ────┐                              │
│ │ [고정 그룹]      │  │ [고정 그룹]      │                              │
│ │ ┃ 통신 휴대폰    │  │ ┃ 월급 정규      │                              │
│ │ [비고정 그룹]    │  │ [비고정 그룹]    │                              │
│ │   식비 배달      │  │   기타 용돈      │                              │
│ │ [+ 새 행]        │  │ [+ 새 행]        │                              │
│ └──────────────────┘  └──────────────────┘                              │
└────────────────────────────────────────────────────────────────────────┘
```

좌(출금)/우(입금). `grid grid-cols-2 gap-4` (데스크탑).

### 5.2 모바일 레이아웃 (< 768px)

```
┌──────────────────────────┐
│ 2026년 5월               │
│ 월별 요약 (grid 2열)     │
│                          │
│ 💸 출금                  │
│ [고정] [비고정] [+ 새 행]│
│                          │
│ 💰 입금                  │
│ [고정] [비고정] [+ 새 행]│
└──────────────────────────┘
```

`flex flex-col gap-6` (모바일). 출금 먼저 위.

### 5.3 거래 행 7컬럼 (UI 라벨 ADR-013 적용)

| # | UI 라벨 | DB 컬럼 | 형식 | 비고 |
|---|---|---|---|---|
| 1 | 1차 카테고리 | `category_1st` | Select | CategoryDropdowns 재사용. type = 그룹의 type 자동 |
| 2 | 2차 카테고리 | `category_2nd` | Select | 1차 선택 후 cascade. nullable |
| 3 | 날짜 | `date` | number 1-31 | UI에선 일자만, 저장 시 `${ym}-${dd}` (clamp to 그 달 마지막 날) |
| 4 | 결제수단 | `payment_method` | Select | active payment_methods만. 입금 행에선 nullable OK |
| 5 | 비고 | `description` | text | 자유 입력. max 200자 |
| 6 | 금액 | `amount` | number | 양수 |
| 7 | 결제여부 | `is_paid` | Switch | 기본 OFF (불러온 데이터 외엔), 결제 완료 시 ON |

`is_fixed`는 행 데이터에 있지만 UI 입력 X — 좌측 보더로 시각 구분만. 사용자가 추가하는 거래는 항상 `is_fixed=false` (고정 거래는 createNextMonth만 생성).

### 5.4 인라인 편집 동작 (CLAUDE.md "키보드 중심")

Phase 4a `FixedExpenseRow` 패턴 그대로:
- 셀 클릭 → 편집 모드
- Tab/Shift+Tab → 다음/이전 셀
- Enter (마지막 셀, 마지막 행) → 새 행 자동 생성 + 첫 셀 focus
- Esc → 변경 취소
- blur → 자동 저장 (필수 필드 채워졌으면 server action 호출)

**필수 필드**: `date` (1-31), `category_1st`, `amount` (양수). 채워지면 저장.

**선택 필드**: `category_2nd`, `payment_method`, `description`, `is_paid`(기본 false).

### 5.5 "+ 새 행" 버튼

각 그룹 (출금/입금) 하단에 표시. 클릭 시 in-memory `temp-<uuid>` 행 추가. Enter on 마지막 셀로도 자동 생성. addTransaction 성공 시 in-memory 행 제거 (revalidate로 실제 행 등장).

### 5.6 자동완성

4b-2 MVP: Select 드롭다운만 (1차/2차/결제수단). 텍스트 typeahead는 Phase 5+ (description 필드만 의미 있음).

### 5.7 컴포넌트 책임

**`TransactionGroups.tsx` (client)**
- props: `{ transactions: Transaction[]; categories: CategoryOption[]; paymentMethods: { id: string; name: string }[]; ym: string }`
- type별로 분리 (expense / income) → 2개 `<TransactionTable>` 렌더
- 데스크탑 `grid grid-cols-2 gap-4` / 모바일 `flex flex-col gap-6`

**`TransactionTable.tsx` (client)**
- props: `{ type: 'income'|'expense'; transactions: Transaction[]; categories; paymentMethods; ym }`
- 정렬 (`sortTransactionsInGroup(transactions)`) → 행 렌더
- 하단에 `<TransactionAddRow>`

**`TransactionRow.tsx` (client)**
- props: `{ transaction: Transaction; categories; paymentMethods; ym }`
- 7 셀 인라인 편집 (Phase 4a 패턴)
- `is_fixed=true`면 좌측 4px 컬러 보더 (예: `border-l-4 border-blue-500`)
- 셀 변경 시 `updateTransaction` 또는 `toggleIsPaid` 호출
- 행 삭제 버튼 (확인 모달 — `DeleteConfirmDialog` Phase 4a 재사용)

**`TransactionAddRow.tsx` (client)**
- props: `{ type: 'income'|'expense'; categories; paymentMethods; ym }`
- "+ 새 행" 버튼 + 인라인 form
- 필수 필드 채워지면 `addTransaction` 호출 (`is_fixed=false`)
- Enter on 마지막 셀로 새 행 자동 생성 트리거

## 6. 정렬 규칙 (`lib/utils/transactions-sort.ts`)

PRD §6 명세 그대로:
```
[고정 그룹] 좌측 4px 컬러 보더 ↑ 위
  → 1차 카테고리 가나다순 오름차순
  → 2차 카테고리 가나다순 오름차순
  → 날짜 오름차순

[비고정 그룹] 좌측 보더 없음 ↓ 아래
  → 날짜 오름차순
```

### 함수 시그니처

```ts
export type SortableTransaction = {
  id: string
  date: string             // 'YYYY-MM-DD'
  category_1st: string
  category_2nd: string | null
  is_fixed: boolean
}

/** 한 그룹 (출금 or 입금) 내에서 PRD §6 규칙대로 정렬 */
export function sortTransactionsInGroup<T extends SortableTransaction>(
  transactions: T[]
): T[]
```

### 구현

```ts
export function sortTransactionsInGroup<T extends SortableTransaction>(
  transactions: T[]
): T[] {
  const koCollator = new Intl.Collator("ko-KR")

  return [...transactions].sort((a, b) => {
    // 1. 고정이 먼저 (is_fixed=true → 위)
    if (a.is_fixed !== b.is_fixed) return a.is_fixed ? -1 : 1

    // 2-a. 고정 그룹: 1차 가나다 → 2차 가나다 → 날짜
    if (a.is_fixed) {
      const c1 = koCollator.compare(a.category_1st, b.category_1st)
      if (c1 !== 0) return c1
      const c2 = koCollator.compare(a.category_2nd ?? "", b.category_2nd ?? "")
      if (c2 !== 0) return c2
      return a.date.localeCompare(b.date)
    }

    // 2-b. 비고정 그룹: 날짜만
    return a.date.localeCompare(b.date)
  })
}
```

**정렬 시점**: client side. Server fetch는 `created_at` 정도로 단순. `TransactionTable.tsx`가 받은 props를 client에서 정렬.

**한글 가나다**: `Intl.Collator("ko-KR")`. 단순 `localeCompare`보다 안정적.

## 7. 월별 요약 7 지표 명세

### 7.1 7 카드 (가계부 흐름 순서)

| # | 라벨 | DB 컬럼 |
|---|---|---|
| 1 | 전월 잔고 | `opening_balance` |
| 2 | 입금 총액 | `income_total` |
| 3 | 출금 총액 | `expense_total` |
| 4 | 실제 출금 | `paid_total` |
| 5 | 남은 출금 | `unpaid_total` |
| 6 | 현재 잔고 | `current_balance` |
| 7 | 예상 잔고 | `expected_balance` |

Phase 3 트리거가 자동 갱신 — 4b-2는 표시만.

### 7.2 레이아웃

- **데스크탑**: `grid grid-cols-7 gap-2` (한 줄)
- **모바일**: `grid grid-cols-2 gap-2` (4행으로 wrap)

### 7.3 강조

- **음수**: `text-red-600` (음수 잔고는 주의 신호)
- 양수/0: 기본 텍스트 색
- 모든 카드 동일 비중 (강조 X — MVP 졸업 후 답답하면 추가)

### 7.4 통화 표기

```ts
new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
}).format(amount)
// 결과: "₩1,000,000"
```

### 7.5 컴포넌트 책임

**`MonthlySummary.tsx` (server)**
- props: `{ summary: MonthlySummaryRow | null }`
- summary null → 렌더 X (page.tsx가 NoMonthYet 분기 처리)
- 7개 `<SummaryCard>` 렌더 (위 순서대로)

**`SummaryCard.tsx` (server)**
- props: `{ label: string; amount: number }`
- 카드 (border + padding) + 라벨 + 금액
- 음수면 빨간색

## 8. `createNextMonth` 확장 (고정지출 자동 INSERT)

### 8.1 동작 변경

**기존 (Phase 4b-1)**: `monthly_summaries` row만 INSERT.

**4b-2 확장**: 추가로 active 고정지출들을 transactions에 bulk INSERT.

### 8.2 ym 유틸 확장

```ts
// lib/utils/ym.ts에 추가

/** 해당 년월의 마지막 일 ("2026-02" → 28, "2026-05" → 31) */
export function lastDayOfMonth(ym: string): number {
  const { year, month } = parseYm(ym)
  return new Date(year, month, 0).getDate()
}

/** ym과 day_of_month를 합쳐서 YYYY-MM-DD. day가 그 달 일수 초과 시 마지막 날로 clamp */
export function ymWithDay(ym: string, dayOfMonth: number): string {
  const last = lastDayOfMonth(ym)
  const day = Math.min(dayOfMonth, last)
  return `${ym}-${String(day).padStart(2, "0")}`
}
```

### 8.3 createNextMonth 코드

```ts
export async function createNextMonth(input: { ym: string }): Promise<Result> {
  // ... 기존 검증 + getAuthedClient ...

  // idempotent
  const { data: existing } = await supabase
    .from("monthly_summaries")
    .select("year_month")
    .eq("year_month", parsed.data.ym)
    .maybeSingle()
  if (existing) {
    revalidatePath("/budget", "layout")
    return { ok: true }
  }

  // 1. 직전 월 잔고 + monthly_summaries INSERT (기존 그대로)
  const prevYm = getPrevYm(parsed.data.ym)
  const { data: prev } = await supabase
    .from("monthly_summaries")
    .select("current_balance")
    .eq("year_month", prevYm)
    .maybeSingle()
  const opening = prev?.current_balance ?? 0

  const { error: sumErr } = await supabase.from("monthly_summaries").insert({
    user_id: user.id,
    year_month: parsed.data.ym,
    opening_balance: opening,
    current_balance: opening,
    expected_balance: opening,
  })
  if (sumErr) return { ok: false, error: sumErr.message }

  // 2. NEW — active 고정지출 bulk INSERT
  const { data: fixed, error: fxErr } = await supabase
    .from("fixed_expenses")
    .select("day_of_month, type, category_1st, category_2nd, payment_method, description, amount")
    .eq("active", true)

  if (fxErr) return { ok: false, error: fxErr.message }

  if (fixed && fixed.length > 0) {
    const rows = fixed.map((f) => ({
      user_id: user.id,
      year_month: parsed.data.ym,
      date: ymWithDay(parsed.data.ym, f.day_of_month),
      type: f.type,
      category_1st: f.category_1st,
      category_2nd: f.category_2nd,
      payment_method: f.payment_method,
      description: f.description,
      amount: f.amount,
      is_paid: false,
      is_fixed: true,
    }))

    const { error: txErr } = await supabase.from("transactions").insert(rows)
    if (txErr) return { ok: false, error: txErr.message }
    // ↑ Phase 3 trg_transactions_recalc fire → monthly_summaries 자동 재계산
  }

  revalidatePath("/budget", "layout")
  return { ok: true }
}
```

### 8.4 트리거 cascade 보장

- 고정지출 INSERT → `trg_transactions_recalc` (Phase 3) fire
- 그 ym + 이후 모든 ym의 `monthly_summaries` 재계산 (`expense_total`, `unpaid_total`, `expected_balance` 갱신)
- `opening_balance`는 그대로 유지 (직전월 current_balance)
- 새 거래 모두 `is_paid=false`라 `paid_total` 변동 X, `current_balance`도 변동 X. `expected_balance`만 줄어듦 (unpaid 증가)

### 8.5 Idempotent 보장

이미 그 ym row 있으면 (`existing`) 조기 반환. 사용자가 "+ 6월 생성" 두 번 클릭해도 고정지출 한 번만 자동 입력.

## 9. Server Actions 명세

### 9.1 `lib/actions/transactions.ts` (4 actions)

```ts
addTransaction(input: AddTransactionInput): Promise<{ ok: true; id?: string } | { ok: false; error: string }>
updateTransaction(input: UpdateTransactionInput): Promise<Result>
deleteTransaction(input: DeleteTransactionInput): Promise<Result>
toggleIsPaid(input: { id: string; is_paid: boolean }): Promise<Result>
  // 편의 — Switch 토글 시 호출. updateTransaction으로도 가능하지만 명시적
```

Phase 4a 패턴 (`AuthedClient` discriminated union) 그대로.

### 9.2 Zod schemas (`lib/validators/transactions.ts`)

```ts
import { z } from "zod"

export const AddTransactionSchema = z.object({
  year_month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(["income", "expense"]),
  category_1st: z.string().min(1),
  category_2nd: z.string().optional().nullable(),
  payment_method: z.string().optional().nullable(),
  description: z.string().max(200).optional().nullable(),
  amount: z.number().positive(),
  is_paid: z.boolean().optional(),
  // is_fixed는 사용자 입력 X — 항상 false (createNextMonth만 true)
})

export const UpdateTransactionSchema = AddTransactionSchema.partial().extend({
  id: z.string().uuid(),
})

export const DeleteTransactionSchema = z.object({
  id: z.string().uuid(),
})

export const ToggleIsPaidSchema = z.object({
  id: z.string().uuid(),
  is_paid: z.boolean(),
})

export type AddTransactionInput = z.infer<typeof AddTransactionSchema>
export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>
export type DeleteTransactionInput = z.infer<typeof DeleteTransactionSchema>
export type ToggleIsPaidInput = z.infer<typeof ToggleIsPaidSchema>
```

### 9.3 revalidatePath

모든 transactions action 끝에 `revalidatePath('/budget/[ym]', 'page')` 호출 — 그 월 페이지만 새로고침 (사이드바는 그대로). 또는 안전하게 `revalidatePath('/budget', 'layout')` (사이드바도 같이 — 약간 비효율적이지만 일관성).

→ **결정**: `revalidatePath('/budget/[ym]', 'page')` 사용. 사이드바는 월 자체가 바뀌지 않으면 갱신 불필요.

## 10. Phase 4a 라벨 통일 (ADR-013)

Phase 4a `FixedExpenseTable.tsx` 헤더의 4 컬럼 라벨 변경 (UI만, DB/action 변경 X):
- "종류" → "종류" (그대로, type은 어색하지 않음)
- "1차" → "1차 카테고리"
- "2차" → "2차 카테고리"
- "결제수단" → "결제수단" (그대로)
- "설명" → "비고"

→ 변경할 셀: `FixedExpenseTable.tsx`의 header `<span>` 4개 (설명만). 다른 라벨은 이미 OK.

Phase 4a 다른 화면(카테고리/결제수단)은 영향 없음.

## 11. 검증 게이트 (Phase 4b-2 완료 조건)

### 11.1 게이트 A — 거래 입력 (수동 + 트리거)

- 5월 페이지에서 출금 그룹 "+ 새 행" → 식비/배달/2026-05-15/보라삼성/김밥/8000/OFF 입력 → blur → 저장
- 페이지 새로고침 → 행 유지
- 월별 요약 표시 갱신: `expense_total=8000, unpaid_total=8000, expected_balance=opening−8000`
- 6월 페이지 → `opening_balance` 영향 없음 (`is_paid=false`라 `current_balance` 변동 X)
- 5월 거래의 결제여부 ON 토글 → `paid_total=8000, current_balance=opening−8000` → 6월 `opening_balance=opening−8000`로 갱신

### 11.2 게이트 B — 정렬 규칙

- 5월 출금에 3개 추가:
  - 통신/휴대폰/10일/고정
  - 주거/월세/25일/고정
  - 식비/외식/20일/비고정
- 기존 거래 (식비/배달/15일/비고정 from 게이트 A)와 함께
- 표시 순서 (위→아래):
  ```
  ┃ 주거 / 월세 / 25일       (고정, 1차 "주거" < "통신")
  ┃ 통신 / 휴대폰 / 10일     (고정)
    식비 / 배달 / 15일       (비고정, 날짜 순)
    식비 / 외식 / 20일       (비고정)
  ```

### 11.3 게이트 C — 좌(출금)/우(입금) 레이아웃

- 5월 입금에 월급/정규/25일/은행/2,000,000 추가 → 우측 테이블에 표시
- 데스크탑: 좌우 동시 보임
- 모바일 (< 768px): 위(출금)/아래(입금)

### 11.4 게이트 D — 다음 월 생성 + 고정지출 자동 INSERT

- 사이드바 "+ N월 생성" 클릭 (가장 미래 월 이후)
- 새 월 생성됨 + active 고정지출 N개가 자동으로 transactions에 INSERT
- 새 월 페이지에서 고정 그룹에 자동 입력된 항목들 표시 (좌측 보더 `┃`)
- 모두 `is_paid=false`
- 월별 요약: `expense_total` = 고정 합, `unpaid_total` = 동일, `expected_balance` = `opening_balance − unpaid_total`
- (선택) `day_of_month=31`이고 그 달이 28/29/30일이면 → 마지막 날로 clamp 확인 (예: 2027-02 → 28일)

### 11.5 게이트 E — 빌드/린트/타입체크

- `pnpm build` 통과
- `pnpm exec tsc --noEmit` 통과
- `pnpm lint` 통과
- git working tree clean

5개 게이트 모두 통과 → **🎉 가계부 MVP 완성** → 일상 사용 가능 → 5년 엑셀 졸업 카운트다운.

## 12. ADR 알림 (Phase 4b-2 종료 시)

```
ADR-013: 거래 컬럼 라벨을 사용자 친화어로 변경
- 일자: 2026-05-30
- 결정: PRD §4 컬럼명 변경 — "구분" → "결제수단", "상세" → "비고", "여부" → "결제여부"
- 이유: 사용자가 더 명확히 인지하는 단어. DB 컬럼은 영문 그대로 (payment_method, description, is_paid), UI 라벨만 변경
- 영향: 거래 입력 테이블 헤더 (TransactionTable/TransactionRow), 고정지출 테이블 헤더 (Phase 4a FixedExpenseTable header "설명" → "비고") 통일

ADR-014: "다음 월 생성" 시 active 고정지출 자동 INSERT
- 일자: 2026-05-30
- 결정: createNextMonth server action이 monthly_summaries row 외에 active fixed_expenses를 transactions에 bulk INSERT
- 이유: PRD §10 Phase 1 MVP "다음 월 생성 버튼 → 빈 페이지 + 고정지출 자동 입력". day_of_month가 그 달 일수 초과 시 마지막 날로 clamp (예: 31일 고정지출 → 2월에 28일)
- 영향: lib/actions/budget-months.ts (createNextMonth 확장), lib/utils/ym.ts (lastDayOfMonth, ymWithDay 헬퍼 추가), Phase 3 트리거 자동 fire하여 monthly_summaries 재계산
```

## 13. Phase 4b-2 완료 정의 (DoD)

- [ ] `lib/utils/ym.ts` 확장 (lastDayOfMonth, ymWithDay 추가)
- [ ] `lib/utils/transactions-sort.ts` 신규 (sortTransactionsInGroup)
- [ ] `lib/validators/transactions.ts` 신규 (4 schemas)
- [ ] `lib/actions/transactions.ts` 신규 (4 server actions)
- [ ] `lib/actions/budget-months.ts` 수정 (createNextMonth 확장)
- [ ] `components/budget/month/MonthlySummary.tsx` + `SummaryCard.tsx`
- [ ] `components/budget/month/TransactionGroups.tsx`
- [ ] `components/budget/month/TransactionTable.tsx`
- [ ] `components/budget/month/TransactionRow.tsx`
- [ ] `components/budget/month/TransactionAddRow.tsx`
- [ ] `app/budget/[ym]/page.tsx` 수정 (MonthlySummary + TransactionGroups 마운트)
- [ ] `components/budget/settings/FixedExpenseTable.tsx` 헤더 라벨 통일 (ADR-013)
- [ ] 5개 검증 게이트 (A-E) 통과
- [ ] git working tree clean
- [ ] ADR-013/014 사용자에게 보고

## 14. 의도적으로 안 하는 것 (YAGNI / 후속)

- ❌ 대시보드 차트 (도넛/스택드 바) — Phase 4c
- ❌ 5년치 엑셀 import (CSV/XLSX) — Phase 5+
- ❌ 패턴 학습 기반 자동 추천 — Phase 5+
- ❌ 정렬 옵션 (컬럼 헤더 클릭) — PRD §6 "MVP에서 제외"
- ❌ 텍스트 typeahead 자동완성 (description) — Phase 5+
- ❌ 거래 검색/필터 — Phase 5+
- ❌ 행 복사/복제 — Phase 5+
- ❌ Realtime 동기화 — 1인용 불필요
- ❌ 백업 자동화 — Phase 6
- ❌ 영수증 첨부 — Phase 5+
- ❌ 음수 빨강 외 색상 강조 (큰 금액 등) — 단순화 시작, 답답하면 추가
- ❌ 일괄 토글 (모든 결제여부 ON) — 사용 안 함
