# Phase 4b-2: 거래 입력 + 정렬 + 월별 요약 + 고정지출 자동 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 가계부 MVP 완성 — 사용자가 거래를 인라인으로 입력하고 잔고/요약을 확인하는 일상 사용 가능한 상태를 만든다.

**Architecture:** Phase 4a/4b-1 위에 거래 CRUD UI 5컴포넌트 + 7 지표 표시 + createNextMonth 확장(고정지출 자동 INSERT). Server Component(read) + Server Actions(write) + 일부 Client Components(인라인 편집) 패턴 그대로. 정렬은 client side `Intl.Collator("ko-KR")` PRD §6 명세대로. Phase 3 트리거(`trg_transactions_recalc`)가 monthly_summaries 자동 갱신 — 4b-2는 표시만.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind, shadcn (Phase 4a 자산), `@supabase/ssr`, Zod, `Intl.Collator`, `Intl.NumberFormat`. **신규 의존성 없음.**

**Spec:** `docs/superpowers/specs/2026-05-30-phase4b2-transactions-and-summary-design.md`

---

## 사전 상태

- 디렉토리: `/Users/seungsoosmacbook/Desktop/seungsoo-life/`
- 최근 커밋: `d7171d8 docs: Phase 4b-2 ... spec 작성`
- Phase 4a 완료: 인증 + 설정 3개 화면 (categories/payment-methods/fixed-expenses)
- Phase 4b-1 완료: 사이드바 + /budget/[ym] 라우팅 + createNextMonth (monthly_summaries만)
- Supabase: 카테고리 36개, 결제수단 4개, 고정지출 1개, 10개 월 (2026-05 ~ 2027-02)
- Phase 3 트리거 작동 검증됨 (게이트 D에서 cascade 확인)
- 기존 `app/budget/[ym]/page.tsx`는 4b-1 (MonthHeader 단순 / NoMonthYet 분기만)
- `lib/utils/ym.ts` 6 헬퍼 + `lib/actions/budget-months.ts` createNextMonth (확장 전)
- Phase 4a 재사용 컴포넌트: `CategoryDropdowns`, `DeleteConfirmDialog`
- `pnpm build`, `pnpm lint`, `pnpm exec tsc --noEmit` 모두 통과 상태

## 파일 구조 (Phase 4b-2 종료 시)

| 경로 | 책임 | 만드는 Task |
|---|---|---|
| `lib/utils/ym.ts` (수정) | 기존 6 + `lastDayOfMonth`, `ymWithDay` 추가 | Task 1 |
| `lib/utils/transactions-sort.ts` | `sortTransactionsInGroup` (PRD §6) | Task 1 |
| `lib/validators/transactions.ts` | 4 Zod schemas (Add/Update/Delete/ToggleIsPaid) | Task 2 |
| `lib/actions/transactions.ts` | 4 server actions | Task 2 |
| `lib/actions/budget-months.ts` (수정) | `createNextMonth`에 고정지출 자동 INSERT 확장 | Task 3 |
| `components/budget/month/MonthlySummary.tsx` | server, 7 카드 wrapper | Task 4 |
| `components/budget/month/SummaryCard.tsx` | server, 한 카드 (라벨 + 금액 + 음수 빨강) | Task 4 |
| `components/budget/month/TransactionRow.tsx` | client, 7 셀 인라인 편집 (가장 복잡) | Task 5 |
| `components/budget/month/TransactionAddRow.tsx` | client, "+ 새 행" 버튼 + 인라인 입력 | Task 6 |
| `components/budget/month/TransactionTable.tsx` | client, 한 그룹: 정렬 + 행 렌더 + AddRow | Task 6 |
| `components/budget/month/TransactionGroups.tsx` | client, 좌(출금)/우(입금) 두 그룹 래퍼 | Task 6 |
| `app/budget/[ym]/page.tsx` (수정) | MonthHeader 단순 → MonthlySummary + TransactionGroups | Task 7 |
| `components/budget/settings/FixedExpenseTable.tsx` (수정) | header "설명" → "비고" 라벨 통일 (ADR-013) | Task 7 |

총 신규 8 파일 + 수정 4 파일.

---

## Task 1: Foundation utils (`ym.ts` 확장 + `transactions-sort.ts`)

**Files:**
- Modify: `lib/utils/ym.ts` (함수 2개 추가)
- Create: `lib/utils/transactions-sort.ts`

**Working directory:** `/Users/seungsoosmacbook/Desktop/seungsoo-life/`

- [ ] **Step 1: ym.ts에 lastDayOfMonth, ymWithDay 추가**

기존 `/Users/seungsoosmacbook/Desktop/seungsoo-life/lib/utils/ym.ts` 파일 끝(`formatYmKorean` 함수 다음)에 추가:

```ts

/** 해당 년월의 마지막 일 (예: "2026-02" → 28, "2026-05" → 31) */
export function lastDayOfMonth(ym: string): number {
  const { year, month } = parseYm(ym)
  // new Date(year, month, 0)에서 day=0은 전월 마지막 날 → 의도된 트릭
  return new Date(year, month, 0).getDate()
}

/** ym + day_of_month → YYYY-MM-DD. day가 그 달 일수 초과 시 마지막 날로 clamp */
export function ymWithDay(ym: string, dayOfMonth: number): string {
  const last = lastDayOfMonth(ym)
  const day = Math.min(dayOfMonth, last)
  return `${ym}-${String(day).padStart(2, "0")}`
}
```

- [ ] **Step 2: transactions-sort.ts 작성**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/lib/utils/transactions-sort.ts`:

```ts
/**
 * 거래 정렬 (PRD §6 명세대로).
 *
 * [고정 그룹] 좌측 4px 컬러 보더 ↑ 위
 *   → 1차 카테고리 가나다순
 *   → 2차 카테고리 가나다순
 *   → 날짜 오름차순
 *
 * [비고정 그룹] 좌측 보더 없음 ↓ 아래
 *   → 날짜 오름차순
 *
 * 한 그룹(출금 or 입금) 내에서 적용. 입금/출금 사이 정렬은 호출자가 처리.
 */

export type SortableTransaction = {
  id: string
  date: string // 'YYYY-MM-DD'
  category_1st: string
  category_2nd: string | null
  is_fixed: boolean
}

export function sortTransactionsInGroup<T extends SortableTransaction>(
  transactions: T[]
): T[] {
  const koCollator = new Intl.Collator("ko-KR")

  return [...transactions].sort((a, b) => {
    // 1. 고정이 먼저 (is_fixed=true → 위)
    if (a.is_fixed !== b.is_fixed) return a.is_fixed ? -1 : 1

    // 2-a. 고정 그룹: 1차 → 2차 → 날짜
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

- [ ] **Step 3: 타입체크 + 빌드 검증**

Run:
```bash
cd /Users/seungsoosmacbook/Desktop/seungsoo-life
pnpm exec tsc --noEmit 2>&1 | tail -3
echo "TSC EXIT: $?"
pnpm build 2>&1 | tail -5
```

Expected: 통과. 새 함수는 아직 import 안 됨 (괜찮음).

**중요: 빌드 실패한 상태로 커밋 금지.**

- [ ] **Step 4: 커밋**

```bash
cd /Users/seungsoosmacbook/Desktop/seungsoo-life
git add lib/utils/ym.ts lib/utils/transactions-sort.ts
git commit -m "feat(utils): ym 확장 (lastDayOfMonth, ymWithDay) + transactions-sort (PRD §6)"
```

---

## Task 2: Transactions validators + server actions

**Files:**
- Create: `lib/validators/transactions.ts`
- Create: `lib/actions/transactions.ts`

**Working directory:** `/Users/seungsoosmacbook/Desktop/seungsoo-life/`

- [ ] **Step 1: validators 작성**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/lib/validators/transactions.ts`:

```ts
import { z } from "zod"

export const AddTransactionSchema = z.object({
  year_month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "year_month 형식 오류"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date 형식 오류"),
  type: z.enum(["income", "expense"]),
  category_1st: z.string().min(1, "1차 카테고리는 필수"),
  category_2nd: z.string().optional().nullable(),
  payment_method: z.string().optional().nullable(),
  description: z.string().max(200).optional().nullable(),
  amount: z.number().positive("금액은 양수"),
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

- [ ] **Step 2: server actions 작성**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/lib/actions/transactions.ts`:

```ts
"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  AddTransactionSchema,
  UpdateTransactionSchema,
  DeleteTransactionSchema,
  ToggleIsPaidSchema,
  type AddTransactionInput,
  type UpdateTransactionInput,
  type DeleteTransactionInput,
  type ToggleIsPaidInput,
} from "@/lib/validators/transactions"

type Result =
  | { ok: true; id?: string }
  | { ok: false; error: string }

type AuthedClient =
  | { ok: false; error: string }
  | {
      ok: true
      supabase: Awaited<ReturnType<typeof createClient>>
      user: NonNullable<
        Awaited<
          ReturnType<Awaited<ReturnType<typeof createClient>>["auth"]["getUser"]>
        >["data"]["user"]
      >
    }

async function getAuthedClient(): Promise<AuthedClient> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "로그인 필요" }
  return { ok: true, supabase, user }
}

export async function addTransaction(
  input: AddTransactionInput
): Promise<Result> {
  const parsed = AddTransactionSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if (!ctx.ok) return { ok: false, error: ctx.error }
  const { supabase, user } = ctx

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      year_month: parsed.data.year_month,
      date: parsed.data.date,
      type: parsed.data.type,
      category_1st: parsed.data.category_1st,
      category_2nd: parsed.data.category_2nd ?? null,
      payment_method: parsed.data.payment_method ?? null,
      description: parsed.data.description ?? null,
      amount: parsed.data.amount,
      is_paid: parsed.data.is_paid ?? false,
      is_fixed: false, // 사용자 추가는 항상 false
    })
    .select("id")
    .single()

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/budget/${parsed.data.year_month}`, "page")
  return { ok: true, id: data?.id }
}

export async function updateTransaction(
  input: UpdateTransactionInput
): Promise<Result> {
  const parsed = UpdateTransactionSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if (!ctx.ok) return { ok: false, error: ctx.error }
  const { supabase } = ctx

  const { id, ...rest } = parsed.data
  const patch: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(rest)) {
    if (v !== undefined) patch[k] = v
  }

  if (Object.keys(patch).length === 0) return { ok: true }

  const { data, error } = await supabase
    .from("transactions")
    .update(patch)
    .eq("id", id)
    .select("year_month")
    .single()

  if (error) return { ok: false, error: error.message }
  if (data?.year_month) {
    revalidatePath(`/budget/${data.year_month}`, "page")
  }
  return { ok: true }
}

export async function deleteTransaction(
  input: DeleteTransactionInput
): Promise<Result> {
  const parsed = DeleteTransactionSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if (!ctx.ok) return { ok: false, error: ctx.error }
  const { supabase } = ctx

  // ym 알아내기 위해 select 후 delete
  const { data: existing } = await supabase
    .from("transactions")
    .select("year_month")
    .eq("id", parsed.data.id)
    .maybeSingle()

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", parsed.data.id)

  if (error) return { ok: false, error: error.message }
  if (existing?.year_month) {
    revalidatePath(`/budget/${existing.year_month}`, "page")
  }
  return { ok: true }
}

export async function toggleIsPaid(input: ToggleIsPaidInput): Promise<Result> {
  const parsed = ToggleIsPaidSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if (!ctx.ok) return { ok: false, error: ctx.error }
  const { supabase } = ctx

  const { data, error } = await supabase
    .from("transactions")
    .update({ is_paid: parsed.data.is_paid })
    .eq("id", parsed.data.id)
    .select("year_month")
    .single()

  if (error) return { ok: false, error: error.message }
  if (data?.year_month) {
    revalidatePath(`/budget/${data.year_month}`, "page")
  }
  return { ok: true }
}
```

- [ ] **Step 3: 타입체크 + 빌드 검증**

Run:
```bash
cd /Users/seungsoosmacbook/Desktop/seungsoo-life
pnpm exec tsc --noEmit 2>&1 | tail -3
echo "TSC EXIT: $?"
pnpm build 2>&1 | tail -5
```

Expected: 통과.

**중요: 빌드 실패한 상태로 커밋 금지.**

- [ ] **Step 4: 커밋**

```bash
git add lib/validators/transactions.ts lib/actions/transactions.ts
git commit -m "feat(transactions): Zod validators + 4 server actions (add/update/delete/toggleIsPaid)"
```

---

## Task 3: `createNextMonth` 확장 (고정지출 자동 INSERT)

**Files:**
- Modify: `lib/actions/budget-months.ts` (전면 교체)

**Working directory:** `/Users/seungsoosmacbook/Desktop/seungsoo-life/`

- [ ] **Step 1: budget-months.ts 전면 교체**

기존 `/Users/seungsoosmacbook/Desktop/seungsoo-life/lib/actions/budget-months.ts`를 다음으로 교체:

```ts
"use server"

import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { getPrevYm, ymWithDay } from "@/lib/utils/ym"

type Result = { ok: true } | { ok: false; error: string }

type AuthedClient =
  | { ok: false; error: string }
  | {
      ok: true
      supabase: Awaited<ReturnType<typeof createClient>>
      user: NonNullable<
        Awaited<
          ReturnType<Awaited<ReturnType<typeof createClient>>["auth"]["getUser"]>
        >["data"]["user"]
      >
    }

async function getAuthedClient(): Promise<AuthedClient> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "로그인 필요" }
  return { ok: true, supabase, user }
}

const CreateNextMonthSchema = z.object({
  ym: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "ym 형식 오류"),
})

export async function createNextMonth(input: { ym: string }): Promise<Result> {
  const parsed = CreateNextMonthSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if (!ctx.ok) return { ok: false, error: ctx.error }
  const { supabase, user } = ctx

  // idempotent — 이미 존재하면 성공으로 간주
  const { data: existing } = await supabase
    .from("monthly_summaries")
    .select("year_month")
    .eq("year_month", parsed.data.ym)
    .maybeSingle()

  if (existing) {
    revalidatePath("/budget", "layout")
    return { ok: true }
  }

  // 1. 직전 월 잔고 + monthly_summaries INSERT
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
    // income_total, expense_total, paid_total, unpaid_total은 DB default 0
  })
  if (sumErr) return { ok: false, error: sumErr.message }

  // 2. active 고정지출 bulk INSERT (Phase 3 트리거가 monthly_summaries 자동 재계산)
  const { data: fixed, error: fxErr } = await supabase
    .from("fixed_expenses")
    .select(
      "day_of_month, type, category_1st, category_2nd, payment_method, description, amount"
    )
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
    //   (방금 INSERT한 행 + 이후 모든 월 cascade)
  }

  revalidatePath("/budget", "layout")
  return { ok: true }
}
```

- [ ] **Step 2: 타입체크 + 빌드 검증**

Run:
```bash
cd /Users/seungsoosmacbook/Desktop/seungsoo-life
pnpm exec tsc --noEmit 2>&1 | tail -3
echo "TSC EXIT: $?"
pnpm build 2>&1 | tail -5
```

Expected: 통과.

**중요: 빌드 실패한 상태로 커밋 금지.**

- [ ] **Step 3: 커밋**

```bash
git add lib/actions/budget-months.ts
git commit -m "feat(budget-months): createNextMonth 확장 — active 고정지출 자동 INSERT [ADR-014]"
```

ADR-014 태그 — 다음 월 생성 시 고정지출 자동 INSERT.

---

## Task 4: `MonthlySummary.tsx` + `SummaryCard.tsx`

**Files:**
- Create: `components/budget/month/MonthlySummary.tsx`
- Create: `components/budget/month/SummaryCard.tsx`

**Working directory:** `/Users/seungsoosmacbook/Desktop/seungsoo-life/`

- [ ] **Step 1: 디렉토리 생성**

Run:
```bash
mkdir -p /Users/seungsoosmacbook/Desktop/seungsoo-life/components/budget/month
```

- [ ] **Step 2: SummaryCard.tsx 작성**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/components/budget/month/SummaryCard.tsx`:

```tsx
import { cn } from "@/lib/utils"

const krwFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
})

export function SummaryCard({
  label,
  amount,
}: {
  label: string
  amount: number
}) {
  const isNegative = amount < 0

  return (
    <div className="rounded border border-neutral-200 p-3">
      <p className="text-xs text-neutral-500">{label}</p>
      <p
        className={cn(
          "mt-1 text-sm font-medium",
          isNegative ? "text-red-600" : "text-neutral-900"
        )}
      >
        {krwFormatter.format(amount)}
      </p>
    </div>
  )
}
```

- [ ] **Step 3: MonthlySummary.tsx 작성**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/components/budget/month/MonthlySummary.tsx`:

```tsx
import { SummaryCard } from "@/components/budget/month/SummaryCard"

export type MonthlySummaryData = {
  opening_balance: number
  income_total: number
  expense_total: number
  paid_total: number
  unpaid_total: number
  current_balance: number
  expected_balance: number
}

const CARDS: { label: string; key: keyof MonthlySummaryData }[] = [
  { label: "전월 잔고", key: "opening_balance" },
  { label: "입금 총액", key: "income_total" },
  { label: "출금 총액", key: "expense_total" },
  { label: "실제 출금", key: "paid_total" },
  { label: "남은 출금", key: "unpaid_total" },
  { label: "현재 잔고", key: "current_balance" },
  { label: "예상 잔고", key: "expected_balance" },
]

export function MonthlySummary({ summary }: { summary: MonthlySummaryData }) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-7">
      {CARDS.map((card) => (
        <SummaryCard
          key={card.key}
          label={card.label}
          amount={Number(summary[card.key])}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: 타입체크 + 빌드 검증**

Run:
```bash
cd /Users/seungsoosmacbook/Desktop/seungsoo-life
pnpm exec tsc --noEmit 2>&1 | tail -3
echo "TSC EXIT: $?"
pnpm build 2>&1 | tail -5
```

Expected: 통과 (아직 import 안 됨).

**중요: 빌드 실패한 상태로 커밋 금지.**

- [ ] **Step 5: 커밋**

```bash
git add components/budget/month/MonthlySummary.tsx components/budget/month/SummaryCard.tsx
git commit -m "feat(budget-month): MonthlySummary + SummaryCard (7 카드, 음수 빨강, KRW)"
```

---

## Task 5: `TransactionRow.tsx` (인라인 편집)

**Files:**
- Create: `components/budget/month/TransactionRow.tsx`

**Working directory:** `/Users/seungsoosmacbook/Desktop/seungsoo-life/`

이 Task는 4b-2의 가장 복잡한 컴포넌트. Phase 4a `FixedExpenseRow` 패턴 따라감.

- [ ] **Step 1: TransactionRow.tsx 작성**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/components/budget/month/TransactionRow.tsx`:

```tsx
"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  CategoryDropdowns,
  type CategoryOption,
} from "@/components/budget/settings/CategoryDropdowns"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DeleteConfirmDialog } from "@/components/budget/settings/DeleteConfirmDialog"
import {
  updateTransaction,
  deleteTransaction,
  toggleIsPaid,
} from "@/lib/actions/transactions"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { ymWithDay } from "@/lib/utils/ym"

export type TransactionRowData = {
  id: string
  year_month: string
  date: string // YYYY-MM-DD
  type: "income" | "expense"
  category_1st: string
  category_2nd: string | null
  payment_method: string | null
  description: string | null
  amount: number
  is_paid: boolean
  is_fixed: boolean
}

export function TransactionRowComponent({
  row,
  categories,
  paymentMethods,
  ym,
}: {
  row: TransactionRowData
  categories: CategoryOption[]
  paymentMethods: { id: string; name: string }[]
  ym: string
}) {
  const [draft, setDraft] = useState<TransactionRowData>(row)
  const [askDelete, setAskDelete] = useState(false)
  const [pending, startTransition] = useTransition()

  // date "YYYY-MM-DD"에서 day만 추출 (UI 표시용)
  const dayOfMonth = Number(draft.date.split("-")[2])

  const persist = (next: TransactionRowData) => {
    startTransition(async () => {
      const result = await updateTransaction({
        id: next.id,
        year_month: next.year_month,
        date: next.date,
        type: next.type,
        category_1st: next.category_1st,
        category_2nd: next.category_2nd,
        payment_method: next.payment_method,
        description: next.description,
        amount: next.amount,
        is_paid: next.is_paid,
      })
      if (!result.ok) toast.error(result.error)
    })
  }

  const onChangeCategory = (next: {
    category_1st?: string | null
    category_2nd?: string | null
  }) => {
    const updated: TransactionRowData = {
      ...draft,
      ...(next.category_1st !== undefined
        ? { category_1st: next.category_1st ?? "" }
        : {}),
      ...(next.category_2nd !== undefined
        ? { category_2nd: next.category_2nd }
        : {}),
    }
    setDraft(updated)
    if (updated.category_1st) persist(updated)
  }

  const onChangePaymentMethod = (v: string) => {
    const updated = { ...draft, payment_method: v || null }
    setDraft(updated)
    persist(updated)
  }

  const onChangeDay = (dayStr: string) => {
    const day = Number(dayStr)
    if (!day || day < 1 || day > 31) {
      setDraft({ ...draft, date: dayStr ? draft.date : draft.date })
      return
    }
    const newDate = ymWithDay(ym, day)
    setDraft({ ...draft, date: newDate })
  }

  const onBlurDay = () => {
    persist(draft)
  }

  const onChangeDescription = (v: string) => {
    setDraft({ ...draft, description: v || null })
  }

  const onChangeAmount = (vStr: string) => {
    setDraft({ ...draft, amount: vStr ? Number(vStr) : 0 })
  }

  const onBlurField = () => {
    persist(draft)
  }

  const onToggleIsPaid = (v: boolean) => {
    setDraft({ ...draft, is_paid: v })
    startTransition(async () => {
      const result = await toggleIsPaid({ id: draft.id, is_paid: v })
      if (!result.ok) toast.error(result.error)
    })
  }

  const onConfirmDelete = () =>
    new Promise<void>((resolve) => {
      startTransition(async () => {
        const result = await deleteTransaction({ id: draft.id })
        if (!result.ok) toast.error(result.error)
        resolve()
      })
    })

  return (
    <div
      className={cn(
        "grid grid-cols-[1fr_1fr_50px_120px_1fr_100px_50px_30px] items-center gap-1 border-b border-neutral-100 px-2 py-1.5 text-sm",
        draft.is_fixed && "border-l-4 border-l-blue-500 bg-blue-50/30"
      )}
    >
      <CategoryDropdowns
        categories={categories}
        type={draft.type}
        value1st={draft.category_1st}
        value2nd={draft.category_2nd}
        onChange={onChangeCategory}
        disabled={pending}
      />
      {/* CategoryDropdowns가 fragment로 1차/2차 2 cell 채움 */}

      <input
        type="number"
        min={1}
        max={31}
        value={dayOfMonth || ""}
        onChange={(e) => onChangeDay(e.target.value)}
        onBlur={onBlurDay}
        disabled={pending}
        className="w-full rounded border border-neutral-300 px-1 py-0.5 text-center"
        placeholder="일"
      />

      <Select
        value={draft.payment_method ?? ""}
        onValueChange={onChangePaymentMethod}
        disabled={pending}
      >
        <SelectTrigger>
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          {paymentMethods.map((pm) => (
            <SelectItem key={pm.id} value={pm.name}>
              {pm.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <input
        type="text"
        value={draft.description ?? ""}
        onChange={(e) => onChangeDescription(e.target.value)}
        onBlur={onBlurField}
        disabled={pending}
        className="w-full rounded border border-neutral-300 px-1 py-0.5"
        placeholder="비고"
      />

      <input
        type="number"
        min={1}
        step={1}
        value={draft.amount || ""}
        onChange={(e) => onChangeAmount(e.target.value)}
        onBlur={onBlurField}
        disabled={pending}
        className="w-full rounded border border-neutral-300 px-1 py-0.5 text-right"
        placeholder="금액"
      />

      <Switch
        checked={draft.is_paid}
        onCheckedChange={onToggleIsPaid}
        disabled={pending}
      />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setAskDelete(true)}
        aria-label="삭제"
      >
        🗑️
      </Button>

      <DeleteConfirmDialog
        open={askDelete}
        onOpenChange={setAskDelete}
        title="거래 삭제"
        message="이 거래를 삭제합니다. 월별 요약이 자동 갱신됩니다."
        onConfirm={onConfirmDelete}
      />
    </div>
  )
}
```

**Grid columns**: `[1fr_1fr_50px_120px_1fr_100px_50px_30px]`
- 1차 카테고리 (1fr) — CategoryDropdowns cell 1
- 2차 카테고리 (1fr) — CategoryDropdowns cell 2
- 날짜 (50px) — input number
- 결제수단 (120px) — Select
- 비고 (1fr) — input text
- 금액 (100px) — input number
- 결제여부 (50px) — Switch
- 삭제 (30px) — Button

총 8 grid children (CategoryDropdowns가 fragment로 2 children + 나머지 6).

- [ ] **Step 2: 타입체크 + 빌드 검증**

Run:
```bash
cd /Users/seungsoosmacbook/Desktop/seungsoo-life
pnpm exec tsc --noEmit 2>&1 | tail -3
echo "TSC EXIT: $?"
pnpm build 2>&1 | tail -5
```

Expected: 통과.

**중요: 빌드 실패한 상태로 커밋 금지.**

- [ ] **Step 3: 커밋**

```bash
git add components/budget/month/TransactionRow.tsx
git commit -m "feat(budget-month): TransactionRow (7 셀 인라인 편집, 고정 좌측 보더)"
```

---

## Task 6: `TransactionAddRow.tsx` + `TransactionTable.tsx` + `TransactionGroups.tsx`

**Files:**
- Create: `components/budget/month/TransactionAddRow.tsx`
- Create: `components/budget/month/TransactionTable.tsx`
- Create: `components/budget/month/TransactionGroups.tsx`

**Working directory:** `/Users/seungsoosmacbook/Desktop/seungsoo-life/`

- [ ] **Step 1: TransactionAddRow.tsx 작성**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/components/budget/month/TransactionAddRow.tsx`:

```tsx
"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  CategoryDropdowns,
  type CategoryOption,
} from "@/components/budget/settings/CategoryDropdowns"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { addTransaction } from "@/lib/actions/transactions"
import { toast } from "sonner"
import { ymWithDay } from "@/lib/utils/ym"

type Draft = {
  category_1st: string | null
  category_2nd: string | null
  day: number | null
  payment_method: string | null
  description: string | null
  amount: number | null
  is_paid: boolean
}

const EMPTY_DRAFT: Draft = {
  category_1st: null,
  category_2nd: null,
  day: null,
  payment_method: null,
  description: null,
  amount: null,
  is_paid: false,
}

export function TransactionAddRow({
  type,
  categories,
  paymentMethods,
  ym,
}: {
  type: "income" | "expense"
  categories: CategoryOption[]
  paymentMethods: { id: string; name: string }[]
  ym: string
}) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [pending, startTransition] = useTransition()

  const allRequiredFilled =
    !!draft.category_1st &&
    draft.day !== null &&
    draft.day >= 1 &&
    draft.day <= 31 &&
    draft.amount !== null &&
    draft.amount > 0

  const save = () => {
    if (!allRequiredFilled) {
      toast.error("1차 카테고리/날짜/금액은 필수")
      return
    }
    startTransition(async () => {
      const result = await addTransaction({
        year_month: ym,
        date: ymWithDay(ym, draft.day!),
        type,
        category_1st: draft.category_1st!,
        category_2nd: draft.category_2nd ?? null,
        payment_method: draft.payment_method ?? null,
        description: draft.description ?? null,
        amount: draft.amount!,
        is_paid: draft.is_paid,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setDraft(EMPTY_DRAFT)
      setAdding(false)
    })
  }

  if (!adding) {
    return (
      <div className="border-t border-neutral-200 p-2">
        <Button size="sm" onClick={() => setAdding(true)}>
          + 새 행
        </Button>
      </div>
    )
  }

  return (
    <div className="border-t border-neutral-200 p-2">
      <div className="grid grid-cols-[1fr_1fr_50px_120px_1fr_100px_50px_30px] items-center gap-1 text-sm">
        <CategoryDropdowns
          categories={categories}
          type={type}
          value1st={draft.category_1st}
          value2nd={draft.category_2nd}
          onChange={(next) =>
            setDraft({
              ...draft,
              ...(next.category_1st !== undefined
                ? { category_1st: next.category_1st }
                : {}),
              ...(next.category_2nd !== undefined
                ? { category_2nd: next.category_2nd }
                : {}),
            })
          }
          disabled={pending}
        />

        <input
          type="number"
          min={1}
          max={31}
          value={draft.day ?? ""}
          onChange={(e) =>
            setDraft({ ...draft, day: e.target.value ? Number(e.target.value) : null })
          }
          disabled={pending}
          className="w-full rounded border border-neutral-300 px-1 py-0.5 text-center"
          placeholder="일"
        />

        <Select
          value={draft.payment_method ?? ""}
          onValueChange={(v) => setDraft({ ...draft, payment_method: v || null })}
          disabled={pending}
        >
          <SelectTrigger>
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {paymentMethods.map((pm) => (
              <SelectItem key={pm.id} value={pm.name}>
                {pm.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <input
          type="text"
          value={draft.description ?? ""}
          onChange={(e) =>
            setDraft({ ...draft, description: e.target.value || null })
          }
          disabled={pending}
          className="w-full rounded border border-neutral-300 px-1 py-0.5"
          placeholder="비고"
        />

        <input
          type="number"
          min={1}
          step={1}
          value={draft.amount ?? ""}
          onChange={(e) =>
            setDraft({
              ...draft,
              amount: e.target.value ? Number(e.target.value) : null,
            })
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") save()
          }}
          disabled={pending}
          className="w-full rounded border border-neutral-300 px-1 py-0.5 text-right"
          placeholder="금액"
        />

        <Switch
          checked={draft.is_paid}
          onCheckedChange={(v) => setDraft({ ...draft, is_paid: v })}
          disabled={pending}
        />

        <span />
      </div>

      <div className="mt-2 flex gap-2">
        <Button size="sm" onClick={save} disabled={pending}>
          {pending ? "저장 중..." : "추가"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setDraft(EMPTY_DRAFT)
            setAdding(false)
          }}
          disabled={pending}
        >
          취소
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TransactionTable.tsx 작성**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/components/budget/month/TransactionTable.tsx`:

```tsx
"use client"

import {
  TransactionRowComponent,
  type TransactionRowData,
} from "@/components/budget/month/TransactionRow"
import { TransactionAddRow } from "@/components/budget/month/TransactionAddRow"
import type { CategoryOption } from "@/components/budget/settings/CategoryDropdowns"
import { sortTransactionsInGroup } from "@/lib/utils/transactions-sort"

export function TransactionTable({
  type,
  transactions,
  categories,
  paymentMethods,
  ym,
}: {
  type: "income" | "expense"
  transactions: TransactionRowData[]
  categories: CategoryOption[]
  paymentMethods: { id: string; name: string }[]
  ym: string
}) {
  const sorted = sortTransactionsInGroup(transactions)
  const title = type === "expense" ? "💸 출금" : "💰 입금"

  return (
    <div className="rounded border border-neutral-200">
      <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-semibold">
        {title}
      </div>

      <div className="grid grid-cols-[1fr_1fr_50px_120px_1fr_100px_50px_30px] gap-1 border-b border-neutral-200 bg-neutral-50/50 px-2 py-1.5 text-xs font-medium text-neutral-500">
        <span>1차 카테고리</span>
        <span>2차 카테고리</span>
        <span>날짜</span>
        <span>결제수단</span>
        <span>비고</span>
        <span className="text-right">금액</span>
        <span>결제여부</span>
        <span />
      </div>

      {sorted.length === 0 ? (
        <p className="px-3 py-4 text-sm text-neutral-500">
          아직 거래가 없습니다.
        </p>
      ) : (
        sorted.map((row) => (
          <TransactionRowComponent
            key={row.id}
            row={row}
            categories={categories}
            paymentMethods={paymentMethods}
            ym={ym}
          />
        ))
      )}

      <TransactionAddRow
        type={type}
        categories={categories}
        paymentMethods={paymentMethods}
        ym={ym}
      />
    </div>
  )
}
```

- [ ] **Step 3: TransactionGroups.tsx 작성**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/components/budget/month/TransactionGroups.tsx`:

```tsx
"use client"

import {
  TransactionTable,
} from "@/components/budget/month/TransactionTable"
import type { TransactionRowData } from "@/components/budget/month/TransactionRow"
import type { CategoryOption } from "@/components/budget/settings/CategoryDropdowns"

export function TransactionGroups({
  transactions,
  categories,
  paymentMethods,
  ym,
}: {
  transactions: TransactionRowData[]
  categories: CategoryOption[]
  paymentMethods: { id: string; name: string }[]
  ym: string
}) {
  const expense = transactions.filter((t) => t.type === "expense")
  const income = transactions.filter((t) => t.type === "income")

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <TransactionTable
        type="expense"
        transactions={expense}
        categories={categories}
        paymentMethods={paymentMethods}
        ym={ym}
      />
      <TransactionTable
        type="income"
        transactions={income}
        categories={categories}
        paymentMethods={paymentMethods}
        ym={ym}
      />
    </div>
  )
}
```

- [ ] **Step 4: 타입체크 + 빌드 검증**

Run:
```bash
cd /Users/seungsoosmacbook/Desktop/seungsoo-life
pnpm exec tsc --noEmit 2>&1 | tail -3
echo "TSC EXIT: $?"
pnpm build 2>&1 | tail -5
```

Expected: 통과.

**중요: 빌드 실패한 상태로 커밋 금지.**

- [ ] **Step 5: 커밋**

```bash
git add components/budget/month/{TransactionAddRow,TransactionTable,TransactionGroups}.tsx
git commit -m "feat(budget-month): TransactionAddRow + TransactionTable + TransactionGroups (좌/우 두 그룹, 정렬)"
```

---

## Task 7: `app/budget/[ym]/page.tsx` 수정 + FixedExpenseTable 라벨 통일

**Files:**
- Modify: `app/budget/[ym]/page.tsx` (전면 교체)
- Modify: `components/budget/settings/FixedExpenseTable.tsx` (header 한 셀만)

**Working directory:** `/Users/seungsoosmacbook/Desktop/seungsoo-life/`

- [ ] **Step 1: app/budget/[ym]/page.tsx 전면 교체**

기존 placeholder MonthHeader/NoMonthYet 구조를 다음으로 교체:

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/app/budget/[ym]/page.tsx`:

```tsx
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { isValidYm, formatYmKorean } from "@/lib/utils/ym"
import { CreateMonthButton } from "@/components/budget/sidebar/CreateMonthButton"
import {
  MonthlySummary,
  type MonthlySummaryData,
} from "@/components/budget/month/MonthlySummary"
import { TransactionGroups } from "@/components/budget/month/TransactionGroups"
import type { TransactionRowData } from "@/components/budget/month/TransactionRow"
import type { CategoryOption } from "@/components/budget/settings/CategoryDropdowns"

export default async function MonthPage({
  params,
}: {
  params: { ym: string }
}) {
  if (!isValidYm(params.ym)) notFound()

  const supabase = await createClient()

  const [
    { data: summary, error: sumErr },
    { data: transactions, error: txErr },
    { data: categories, error: catErr },
    { data: paymentMethods, error: pmErr },
  ] = await Promise.all([
    supabase
      .from("monthly_summaries")
      .select(
        "opening_balance, income_total, expense_total, paid_total, unpaid_total, current_balance, expected_balance"
      )
      .eq("year_month", params.ym)
      .maybeSingle(),
    supabase
      .from("transactions")
      .select(
        "id, year_month, date, type, category_1st, category_2nd, payment_method, description, amount, is_paid, is_fixed"
      )
      .eq("year_month", params.ym),
    supabase
      .from("categories")
      .select("id, name, type, parent_id")
      .order("type", { ascending: true })
      .order("sort_order", { ascending: true }),
    supabase
      .from("payment_methods")
      .select("id, name")
      .eq("active", true)
      .order("sort_order", { ascending: true }),
  ])

  if (sumErr || txErr || catErr || pmErr) {
    const msg = sumErr?.message ?? txErr?.message ?? catErr?.message ?? pmErr?.message
    return <p className="p-8 text-sm text-red-600">에러: {msg}</p>
  }

  if (!summary) {
    return <NoMonthYet ym={params.ym} />
  }

  // monthly_summaries 컬럼은 numeric → string으로 반환되므로 Number() cast
  const summaryData: MonthlySummaryData = {
    opening_balance: Number(summary.opening_balance),
    income_total: Number(summary.income_total),
    expense_total: Number(summary.expense_total),
    paid_total: Number(summary.paid_total),
    unpaid_total: Number(summary.unpaid_total),
    current_balance: Number(summary.current_balance),
    expected_balance: Number(summary.expected_balance),
  }

  const rows: TransactionRowData[] = (transactions ?? []).map((t) => ({
    id: t.id,
    year_month: t.year_month,
    date: t.date,
    type: t.type as "income" | "expense",
    category_1st: t.category_1st,
    category_2nd: t.category_2nd,
    payment_method: t.payment_method,
    description: t.description,
    amount: Number(t.amount),
    is_paid: t.is_paid,
    is_fixed: t.is_fixed,
  }))

  const cats: CategoryOption[] = (categories ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type as "income" | "expense",
    parent_id: c.parent_id,
  }))

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">{formatYmKorean(params.ym)}</h1>
      <MonthlySummary summary={summaryData} />
      <TransactionGroups
        transactions={rows}
        categories={cats}
        paymentMethods={paymentMethods ?? []}
        ym={params.ym}
      />
    </div>
  )
}

function NoMonthYet({ ym }: { ym: string }) {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h1 className="text-2xl font-bold">{formatYmKorean(ym)}</h1>
      <p className="mt-4 text-sm text-neutral-500">
        이 월은 아직 생성되지 않았습니다.
      </p>
      <div className="mt-6">
        <CreateMonthButton ym={ym} label="이 월 생성" variant="primary" />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: FixedExpenseTable.tsx 라벨 변경**

기존 `/Users/seungsoosmacbook/Desktop/seungsoo-life/components/budget/settings/FixedExpenseTable.tsx`에서 header 부분의 `<span>설명</span>`을 찾아 `<span>비고</span>`로 변경.

Edit the file's header section: 기존:
```tsx
        <span>설명</span>
```
새로:
```tsx
        <span>비고</span>
```

(다른 라벨 "활성", "일", "종류", "1차", "2차", "결제수단", "금액"은 그대로 — Phase 4a에서 이미 사용자 친화적)

- [ ] **Step 3: 타입체크 + 빌드 검증**

Run:
```bash
cd /Users/seungsoosmacbook/Desktop/seungsoo-life
pnpm exec tsc --noEmit 2>&1 | tail -3
echo "TSC EXIT: $?"
pnpm build 2>&1 | tail -10
```

Expected: 통과. `/budget/[ym]` 라우트 크기 늘어남 (컴포넌트 추가).

**중요: 빌드 실패한 상태로 커밋 금지.**

- [ ] **Step 4: 커밋**

```bash
git add app/budget/[ym]/page.tsx components/budget/settings/FixedExpenseTable.tsx
git commit -m "feat(budget-month): /budget/[ym] 페이지에 MonthlySummary + TransactionGroups 마운트 + 라벨 통일 [ADR-013]"
```

---

## Task 8: USER MANUAL — Gate A + B + C 검증

**Files:** (없음 — 브라우저 수동)

- [ ] **Step 1: dev 서버 띄우기**

Run:
```bash
cd /Users/seungsoosmacbook/Desktop/seungsoo-life
pnpm dev > /tmp/dev.log 2>&1 &
echo "dev PID: $!"
sleep 6
curl -s -o /dev/null -w "ready: %{http_code}\n" http://localhost:3000/signin
```

Expected: ready 200.

- [ ] **Step 2: 사용자 안내 출력 (USER PAUSE)**

다음을 사용자에게 그대로 출력:

```
🔴 USER PAUSE — Gate A (거래 입력) + B (정렬) + C (좌우 레이아웃)

이미 로그인 상태면 곧장. 아니면 /signin → Google.

【Gate A — 거래 입력 + 트리거】
1. 사이드바에서 2026-05 클릭 → 5월 페이지 진입
2. 상단에 월별 요약 7개 카드 표시 (전월/입금/출금/실제/남은/현재/예상)
   → 처음엔 모두 ₩0 (이전 게이트의 cleanup 후 상태)
3. 좌측 출금 그룹 "+ 새 행" 클릭
   → 인라인 폼 등장
   → 1차=식비, 2차=배달, 일=15, 결제수단=보라삼성, 비고=김밥, 금액=8000, 결제여부=OFF
   → "추가" 클릭 → 행 등장 (좌측 보더 없음, 비고정)
4. 월별 요약 갱신 확인:
   - 출금 총액: ₩8,000
   - 남은 출금: ₩8,000
   - 예상 잔고: -₩8,000 (빨강)
5. 같은 행의 결제여부 Switch ON 토글
   → 잠시 후:
   - 실제 출금: ₩8,000
   - 남은 출금: ₩0
   - 현재 잔고: -₩8,000 (빨강)
   - 예상 잔고: -₩8,000
6. 사이드바에서 2026-06 클릭 → 6월 페이지
   → 전월 잔고: -₩8,000 (5월 결제완료 cascade)

【Gate B — 정렬 규칙】
7. 5월로 돌아가서 출금에 3개 추가:
   - 통신 / 휴대폰 / 10일 / 삼성 / KT / 70000 / OFF
   - 주거 / 월세 / 25일 / 보라삼성 / 서대문빌라 / 650000 / OFF
   - 식비 / 외식 / 20일 / 보라삼성 / 분식집 / 12000 / OFF
8. (선택) 통신/주거 두 거래의 is_fixed를 true로 강제하려면 Supabase 대시보드에서 직접 UPDATE 필요.
   대신 가장 정확한 정렬 검증은 Gate D에서 "+ 새 월 생성"으로 자동 입력되는 고정지출들로 확인.
   Gate B 단순 검증: 4개 비고정 거래가 날짜 순으로 정렬됨 (10일 → 15일 → 20일 → 25일)

【Gate C — 좌(출금)/우(입금) 레이아웃】
9. 5월 입금 그룹 "+ 새 행" → 1차=월급, 2차=정규, 일=25, 결제수단=(비움), 비고=5월 월급, 금액=2000000, 결제여부=ON
10. 데스크탑: 좌측 출금 / 우측 입금 동시 보임
11. (선택) 브라우저 창 768px 미만으로 좁힘 → 위(출금) / 아래(입금) 세로 배치
12. 월별 요약 갱신:
    - 입금 총액: ₩2,000,000
    - 출금 총액: ₩740,000 (8000+70000+650000+12000)
    - 실제 출금: ₩8,000 (식비 배달만 paid)
    - 남은 출금: ₩732,000
    - 현재 잔고: ₩1,992,000 (2M − 8000)
    - 예상 잔고: ₩1,260,000 (1.992M − 732K)

세 게이트 다 통과하면 "Gate A + B + C 통과" 알려줘. 막히면 어떤 step / 무슨 에러인지.
```

- [ ] **Step 3: 사용자 응답 대기**

사용자가 완료 보고할 때까지 진행하지 않음.

- [ ] **Step 4: dev 서버 종료**

```bash
pkill -f "next dev|pnpm dev" 2>/dev/null
sleep 1
```

**커밋 없음** (검증만)

---

## Task 9: USER MANUAL — Gate D (createNextMonth + 고정지출 자동)

**Files:** (없음 — 브라우저 수동 + MCP)

- [ ] **Step 1: 현재 고정지출 상태 확인**

MCP 호출:
```
mcp__claude_ai_Supabase__execute_sql
project_id: "iwrcprtjyxzfsriiupsw"
query: |
  select id, day_of_month, type, category_1st, category_2nd, payment_method, description, amount, active
    from public.fixed_expenses
   where active = true
   order by day_of_month;
```

Expected: 사용자가 Phase 4a에서 입력한 active 고정지출 N개 (최소 1개, Gate C 시점에 있던 거).

만약 active 고정지출 0개면 사용자에게 안내: "/budget/settings/fixed-expenses에서 active 고정지출 한 두 개 먼저 추가해주세요. day_of_month=31 인 것도 하나 있으면 clamp 검증 가능."

- [ ] **Step 2: 새 미래 월 생성용 dev 서버 띄우기**

Run:
```bash
cd /Users/seungsoosmacbook/Desktop/seungsoo-life
pnpm dev > /tmp/dev.log 2>&1 &
echo "dev PID: $!"
sleep 6
```

- [ ] **Step 3: 사용자 안내 출력 (USER PAUSE)**

```
🔴 USER PAUSE — Gate D (다음 월 생성 + 고정지출 자동 INSERT)

1. 사이드바 하단 "+ N월 생성" 버튼 확인 (현재 마지막 월 + 1, 예: 2027-03)
2. 클릭 → 자동으로 새 월 페이지 이동
3. 새 월 페이지에서 확인:
   - 거래 그룹들에 active 고정지출이 자동으로 입력됨
   - 각 행 좌측에 4px 파란 보더 (고정 표시)
   - 모두 결제여부 = OFF
   - 정렬: 1차 가나다 → 2차 가나다 → 날짜 순 (PRD §6)
4. 월별 요약 확인:
   - 전월 잔고: 직전 월의 current_balance
   - 출금 총액: active 고정지출(expense type) 합
   - 입금 총액: active 고정지출(income type) 합
   - 실제 출금: 0 (모두 unpaid)
   - 남은 출금: 출금 총액과 동일
   - 현재 잔고: 전월 잔고 + 입금 (paid 없음이라)
   - 예상 잔고: 현재 잔고 − 남은 출금
5. (선택) day_of_month=31 인 고정지출 있으면, 2월 (예: 2027-02) 페이지에서 그 거래의 날짜가 28일(또는 29일)로 clamp됐는지 확인
6. 사이드바 트리에 새 월 추가됨 + ⭐ 표시 (오늘 속한 월에)

【Idempotent 검증 (선택)】
7. 이미 생성된 월의 URL을 직접 입력 (예: /budget/2026-06)
   → MonthHeader 표시 (NoMonthYet 아님)
   → 한 번 더 "+ 생성" 클릭 시도 (URL 직접 또는 sidebar) → 에러 없이 그냥 그 페이지 이동

다 통과하면 "Gate D 통과" 알려줘. 막히면 어떤 step / 무슨 에러인지.
```

- [ ] **Step 4: 사용자 응답 대기 + dev 종료**

```bash
pkill -f "next dev|pnpm dev" 2>/dev/null
sleep 1
```

**커밋 없음** (검증만)

---

## Task 10: Gate E + ADR-013/014 알림

**Files:** (없음 — 확인만)

- [ ] **Step 1: 빌드/린트/타입체크**

Run:
```bash
cd /Users/seungsoosmacbook/Desktop/seungsoo-life
pnpm build 2>&1 | tail -8
echo "---LINT---"
pnpm lint 2>&1 | tail -3
echo "---TSC---"
pnpm exec tsc --noEmit 2>&1 | tail -3 ; echo "TSC EXIT: $?"
```

Expected: 세 가지 모두 통과.

- [ ] **Step 2: git 상태 확인**

Run:
```bash
cd /Users/seungsoosmacbook/Desktop/seungsoo-life
git status --short
git log --oneline -10
git ls-files | grep "\.env\.local$" ; echo "(empty = OK)"
```

Expected:
- `git status`: 빈 출력 (working tree clean)
- `git log`: Phase 4b-2 신규 커밋 7개 (Task 1~7)
- `.env.local` 추적 안 됨

- [ ] **Step 3: Supabase 상태 점검**

MCP:
```
mcp__claude_ai_Supabase__execute_sql
project_id: "iwrcprtjyxzfsriiupsw"
query: |
  select 'transactions' as t, count(*) from public.transactions
  union all select 'monthly_summaries', count(*) from public.monthly_summaries
  union all select 'fixed_expenses(active)', count(*) from public.fixed_expenses where active=true
  order by t;
```

Expected: 사용자가 게이트에서 입력한 거래 + 자동 고정지출 다 보임.

- [ ] **Step 4: ADR 알림 출력**

사용자에게 다음 메시지 출력:

```
🎉 Phase 4b-2 완료 — 가계부 MVP 완성!

✅ Gate A: 거래 입력 + Phase 3 트리거 cascade
✅ Gate B: 정렬 규칙 (PRD §6)
✅ Gate C: 좌(출금)/우(입금) 레이아웃 + 월별 요약 7 카드
✅ Gate D: createNextMonth + active 고정지출 자동 INSERT + day_of_month clamp
✅ Gate E: pnpm build / lint / tsc 통과, git clean

🎊 일상 사용 가능 → 5년 엑셀 졸업 카운트다운 시작

⚠️ Notion 업데이트 필요 — ADR 2건 (가계부 모듈 페이지 §14 누적)

ADR-013: 거래 컬럼 라벨을 사용자 친화어로 변경
- 일자: 2026-05-30
- 결정: PRD §4 컬럼명 변경 — "구분" → "결제수단", "상세" → "비고", "여부" → "결제여부"
- 이유: 사용자가 더 명확히 인지하는 단어. DB 컬럼은 영문 그대로 (payment_method, description, is_paid), UI 라벨만 변경
- 영향: 거래 입력 테이블 헤더 (TransactionTable), 고정지출 테이블 헤더 (FixedExpenseTable "설명" → "비고") 통일

ADR-014: "다음 월 생성" 시 active 고정지출 자동 INSERT
- 일자: 2026-05-30
- 결정: createNextMonth server action이 monthly_summaries row 외에 active fixed_expenses를 transactions에 bulk INSERT
- 이유: PRD §10 Phase 1 MVP "다음 월 생성 버튼 → 빈 페이지 + 고정지출 자동 입력". day_of_month가 그 달 일수 초과 시 마지막 날로 clamp (예: 31일 고정지출 → 2월에 28일)
- 영향: lib/actions/budget-months.ts (createNextMonth 확장), lib/utils/ym.ts (lastDayOfMonth, ymWithDay 헬퍼), Phase 3 트리거 자동 fire하여 monthly_summaries 재계산
```

**커밋 없음**

---

## Final Verification Summary

모든 Task 완료 후 다음 상태가 보장됨:

- [ ] `lib/utils/ym.ts` 확장 (lastDayOfMonth, ymWithDay)
- [ ] `lib/utils/transactions-sort.ts` 신규 (sortTransactionsInGroup)
- [ ] `lib/validators/transactions.ts` 신규 (4 schemas)
- [ ] `lib/actions/transactions.ts` 신규 (4 server actions)
- [ ] `lib/actions/budget-months.ts` 수정 (createNextMonth + 고정지출 자동 INSERT)
- [ ] `components/budget/month/MonthlySummary.tsx` + `SummaryCard.tsx`
- [ ] `components/budget/month/TransactionRow.tsx`
- [ ] `components/budget/month/TransactionAddRow.tsx`
- [ ] `components/budget/month/TransactionTable.tsx`
- [ ] `components/budget/month/TransactionGroups.tsx`
- [ ] `app/budget/[ym]/page.tsx` 수정 (MonthlySummary + TransactionGroups 마운트)
- [ ] `components/budget/settings/FixedExpenseTable.tsx` header 라벨 통일
- [ ] 5개 검증 게이트 (A-E) 통과
- [ ] git working tree clean
- [ ] ADR-013/014 사용자에게 보고

---

## 트러블슈팅

**`updateTransaction`이 호출되지 않음 (blur 자동 저장 안 됨):**
- TransactionRow의 `onBlurField` 호출 확인. input/select에서 `onBlur` 핸들러 연결됐는지.
- pending 상태 확인 (`disabled={pending}` — 너무 빨리 다음 blur 발생 시 무시될 수 있음).

**고정 거래가 좌측 보더 안 보임:**
- TransactionRow의 `is_fixed` 클래스 적용 확인. `cn(..., draft.is_fixed && "border-l-4 border-l-blue-500 bg-blue-50/30")`.
- Tailwind purge 문제일 수 있음 — `tailwind.config.ts`의 `content`에 `./components/**/*.{ts,tsx}` 포함됐는지 확인 (Phase 2부터 OK).

**정렬이 의도와 다름:**
- `Intl.Collator("ko-KR")` 한글 자모 처리 — 일반적으로 OK.
- 비고정인데 가나다 정렬로 보임 → `is_fixed` 값이 실제 false인지 DB에서 확인 (MCP execute_sql).
- 동일 카테고리/날짜인데 순서가 매번 바뀜 → 정렬 안정성은 보장됨 (`Array.prototype.sort`는 stable).

**`createNextMonth`가 고정지출 INSERT 안 함:**
- `fixed_expenses where active=true` 행이 있는지 확인 (`mcp__claude_ai_Supabase__execute_sql`).
- 만약 있는데 INSERT 안 되면 RLS 정책 확인 — server action이 사용자 user_id로 호출됐는지.
- 만약 `ymWithDay` 결과가 invalid date면 PostgreSQL이 거부함. `lastDayOfMonth(ym)` 결과 확인.

**`Promise.all` fetch가 한 쿼리만 실패해도 전체 페이지 에러:**
- 4 쿼리 중 일부만 실패하면 안 좋음. 현재 코드는 모든 에러 모음 → 첫 에러 메시지 표시. 디버깅 시 어떤 fetch가 실패했는지 메시지로 알 수 있음.

**모바일에서 grid columns가 너무 좁아 텍스트 안 보임:**
- `[1fr_1fr_50px_120px_1fr_100px_50px_30px]` 8 컬럼은 모바일에서 좁음. 일단 가로 스크롤 허용 (`overflow-x-auto`로 부모 wrap 필요할 수 있음).
- 답답하면 모바일에선 다른 컬럼 구조 (예: 카드 형식) — Phase 5+에서 결정.

**TransactionAddRow에서 Enter on amount field 시 form submit:**
- `onKeyDown` 에서 `e.key === "Enter"` 처리해서 `save()` 호출. `e.preventDefault()`는 input 기본 동작 (Enter = submit form)이라 의미 있지만 form 외부라 무관.

---

## 의도적으로 안 함 (이 plan의 범위 밖)

- 대시보드 차트 (도넛/스택드 바) — Phase 4c
- 5년 엑셀 import — Phase 5+
- 패턴 학습 자동 추천 — Phase 5+
- 정렬 옵션 (컬럼 헤더 클릭) — PRD §6 MVP 제외
- 텍스트 typeahead 자동완성 (description) — Phase 5+
- 거래 검색/필터 — Phase 5+
- 행 복사/복제 — Phase 5+
- Realtime 동기화 — 1인용 불필요
- 백업 자동화 — Phase 6
- 영수증 첨부 — Phase 5+
- 음수 빨강 외 색상 강조 (큰 금액 등) — 단순화 시작, 답답하면 추가
- 일괄 토글 (모든 결제여부 ON) — 사용 안 함
- Tab on last cell으로 새 행 자동 생성 — TransactionAddRow는 명시적 "+ 새 행" 버튼만 (단순화)
