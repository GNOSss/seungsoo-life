# 모바일 반응형 재설계 (Phase 4b-3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/budget/[ym]` 메인 페이지와 `/budget/settings/fixed-expenses` 설정 페이지의 iPhone (≤430px) 가로 오버플로우 해결.

**Architecture:** Mobile/Desktop 분기 = 같은 페이지에 두 트리 동시 SSR + Tailwind `md:hidden` / `hidden md:block` CSS 분기. 모바일 = Card stack (읽기) + vaul Bottom sheet (편집). 데스크탑 = 현재 8컬럼 인라인 테이블 유지.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind, base-ui, vaul (신규), Supabase, Zod, sonner.

**Spec:** `docs/superpowers/specs/2026-06-01-mobile-responsive-design.md`

**테스트 전략:** 자동화 테스트 인프라 없음 — 각 Task 후 `pnpm exec tsc --noEmit` + 수동 시각 확인. 전체 종료 시 Gate A~E (spec §9).

---

## File Structure

### 신규
- `components/budget/month/TransactionCardMobile.tsx` — 거래 1개 카드 (display + is_paid 1-tap)
- `components/budget/month/TransactionCardList.tsx` — 카드 리스트 + AddButton + editingId 상태
- `components/budget/month/TransactionEditSheet.tsx` — vaul Drawer + 폼 (edit/add 모드)
- `components/budget/settings/FixedExpenseCardMobile.tsx` — 고정지출 카드
- `components/budget/settings/FixedExpenseCardList.tsx` — 카드 리스트 + AddButton
- `components/budget/settings/FixedExpenseEditSheet.tsx` — vaul Drawer + 폼

### 수정
- `components/budget/month/SummaryCard.tsx` — `hero?: boolean` prop
- `components/budget/month/MonthlySummary.tsx` — 모바일/데스크탑 분기
- `components/budget/month/TransactionGroups.tsx` — `hidden md:block` / `md:hidden` 분기
- `app/budget/[ym]/page.tsx` — padding/typography 반응형
- `components/budget/settings/FixedExpenseTable.tsx` — 변경 없음 (wrap은 부모에서)
- `app/budget/settings/fixed-expenses/page.tsx` — `hidden md:block` / `md:hidden` 분기, CardList 통합

### 의존성
- 추가: `vaul@^1`

---

## Task 1: vaul 패키지 추가

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml` (자동)

- [ ] **Step 1: pnpm 설치**

```bash
pnpm add vaul
```

- [ ] **Step 2: 설치 확인**

```bash
pnpm list vaul
```

Expected: `vaul X.Y.Z` (1.x 이상) 출력.

- [ ] **Step 3: TypeScript 컴파일 확인**

```bash
pnpm exec tsc --noEmit
```

Expected: 0 error.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: vaul 패키지 추가 (모바일 bottom sheet용) [ADR-019]"
```

---

## Task 2: SummaryCard hero prop 추가

**Files:**
- Modify: `components/budget/month/SummaryCard.tsx`

- [ ] **Step 1: SummaryCard.tsx 수정**

기존 파일을 다음 내용으로 교체:

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
  hero = false,
}: {
  label: string
  amount: number
  hero?: boolean
}) {
  const isNegative = amount < 0

  return (
    <div
      className={cn(
        "rounded border border-neutral-200",
        hero ? "p-4" : "p-3"
      )}
    >
      <p className={cn("text-neutral-500", hero ? "text-sm" : "text-xs")}>
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-medium tabular-nums",
          hero ? "text-lg font-semibold" : "text-sm",
          isNegative ? "text-red-600" : "text-neutral-900"
        )}
      >
        {krwFormatter.format(amount)}
      </p>
    </div>
  )
}
```

- [ ] **Step 2: 타입 체크**

```bash
pnpm exec tsc --noEmit
```

Expected: 0 error.

- [ ] **Step 3: Commit**

```bash
git add components/budget/month/SummaryCard.tsx
git commit -m "feat: SummaryCard에 hero prop 추가 (모바일 강조용)"
```

---

## Task 3: MonthlySummary 모바일/데스크탑 분기

**Files:**
- Modify: `components/budget/month/MonthlySummary.tsx`

- [ ] **Step 1: MonthlySummary.tsx 교체**

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

const DESKTOP_CARDS: { label: string; key: keyof MonthlySummaryData }[] = [
  { label: "전월 잔고", key: "opening_balance" },
  { label: "입금 총액", key: "income_total" },
  { label: "출금 총액", key: "expense_total" },
  { label: "실제 출금", key: "paid_total" },
  { label: "남은 출금", key: "unpaid_total" },
  { label: "현재 잔고", key: "current_balance" },
  { label: "예상 잔고", key: "expected_balance" },
]

const MOBILE_GRID_CARDS: { label: string; key: keyof MonthlySummaryData }[] = [
  { label: "전월 잔고", key: "opening_balance" },
  { label: "입금 총액", key: "income_total" },
  { label: "출금 총액", key: "expense_total" },
  { label: "실제 출금", key: "paid_total" },
  { label: "남은 출금", key: "unpaid_total" },
  { label: "현재 잔고", key: "current_balance" },
]

export function MonthlySummary({ summary }: { summary: MonthlySummaryData }) {
  return (
    <>
      {/* Mobile: Hero + 2col grid */}
      <div className="space-y-2 md:hidden">
        <SummaryCard
          label="예상 잔고"
          amount={Number(summary.expected_balance)}
          hero
        />
        <div className="grid grid-cols-2 gap-2">
          {MOBILE_GRID_CARDS.map((card) => (
            <SummaryCard
              key={card.key}
              label={card.label}
              amount={Number(summary[card.key])}
            />
          ))}
        </div>
      </div>

      {/* Desktop: 7col single row */}
      <div className="hidden gap-2 md:grid md:grid-cols-7">
        {DESKTOP_CARDS.map((card) => (
          <SummaryCard
            key={card.key}
            label={card.label}
            amount={Number(summary[card.key])}
          />
        ))}
      </div>
    </>
  )
}
```

- [ ] **Step 2: 타입 체크**

```bash
pnpm exec tsc --noEmit
```

Expected: 0 error.

- [ ] **Step 3: 시각 확인**

`pnpm dev` 실행 후 `/budget/2026-06`:
- 데스크탑 폭 (>= 768px): 카드 7개 한 줄
- 모바일 폭 (devtools iPhone 14 Pro Max 430): 예상 잔고 hero (큰 텍스트) + 2col 6개

- [ ] **Step 4: Commit**

```bash
git add components/budget/month/MonthlySummary.tsx
git commit -m "feat: MonthlySummary 모바일 분기 (Hero+2col) [ADR-018]"
```

---

## Task 4: TransactionCardMobile (display only)

**Files:**
- Create: `components/budget/month/TransactionCardMobile.tsx`

- [ ] **Step 1: 새 파일 생성**

```tsx
"use client"

import { useState, useTransition } from "react"
import { cn } from "@/lib/utils"
import { toggleIsPaid } from "@/lib/actions/transactions"
import { toast } from "sonner"
import type { TransactionRowData } from "@/components/budget/month/TransactionRow"

const krwFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
})

export function TransactionCardMobile({
  row,
  onTap,
}: {
  row: TransactionRowData
  onTap: () => void
}) {
  const [isPaid, setIsPaid] = useState(row.is_paid)
  const [pending, startTransition] = useTransition()

  const day = Number(row.date.split("-")[2])

  const onTogglePaid = (e: React.MouseEvent) => {
    e.stopPropagation()
    const next = !isPaid
    setIsPaid(next) // 낙관적
    startTransition(async () => {
      const result = await toggleIsPaid({ id: row.id, is_paid: next })
      if (!result.ok) {
        setIsPaid(!next) // 롤백
        toast.error(result.error)
      }
    })
  }

  return (
    <div
      className={cn(
        "relative flex flex-col gap-1 rounded border border-neutral-200 bg-white px-3 py-2.5",
        row.is_fixed && "border-l-4 border-l-blue-500 bg-blue-50/30",
        !isPaid && row.type === "expense" && "ring-1 ring-amber-200"
      )}
    >
      {/* Row 1: 카테고리 + 일 */}
      <div className="flex items-center justify-between">
        <span className="truncate pr-2 text-sm font-medium">
          {row.category_1st}
          {row.category_2nd ? (
            <>
              <span className="mx-1 text-neutral-400">▸</span>
              {row.category_2nd}
            </>
          ) : null}
        </span>
        <span className="shrink-0 text-xs text-neutral-500 tabular-nums">
          {day}일
        </span>
      </div>

      {/* Row 2: 결제수단 · 비고 */}
      <div className="truncate text-xs text-neutral-500">
        {row.payment_method ?? "—"}
        {row.description ? ` · ${row.description}` : ""}
      </div>

      {/* Row 3: 금액 + pill */}
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-base font-semibold tabular-nums",
            row.type === "income" ? "text-emerald-600" : "text-neutral-900"
          )}
        >
          {krwFormatter.format(row.amount)}
        </span>
        <button
          type="button"
          onClick={onTogglePaid}
          disabled={pending}
          className={cn(
            "relative z-10 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            isPaid
              ? "bg-emerald-500 text-white"
              : "bg-neutral-200 text-neutral-600"
          )}
          aria-label={isPaid ? "결제 완료" : "결제 대기"}
        >
          {isPaid ? "✓ 완료" : "대기"}
        </button>
      </div>

      {/* 카드 전체 탭 영역 (pill 제외) */}
      <button
        type="button"
        onClick={onTap}
        className="absolute inset-0 rounded"
        aria-label="거래 편집"
      >
        <span className="sr-only">편집</span>
      </button>
    </div>
  )
}
```

- [ ] **Step 2: 타입 체크**

```bash
pnpm exec tsc --noEmit
```

Expected: 0 error.

- [ ] **Step 3: Commit**

```bash
git add components/budget/month/TransactionCardMobile.tsx
git commit -m "feat: TransactionCardMobile 컴포넌트 추가 (display + is_paid 1-tap) [ADR-016]"
```

---

## Task 5: TransactionEditSheet (vaul Drawer + 폼)

**Files:**
- Create: `components/budget/month/TransactionEditSheet.tsx`

- [ ] **Step 1: 새 파일 생성**

```tsx
"use client"

import { useState, useTransition, useEffect } from "react"
import { Drawer } from "vaul"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CategoryDropdowns,
  type CategoryOption,
} from "@/components/budget/settings/CategoryDropdowns"
import { DeleteConfirmDialog } from "@/components/budget/settings/DeleteConfirmDialog"
import {
  addTransaction,
  updateTransaction,
  deleteTransaction,
} from "@/lib/actions/transactions"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { ymWithDay, lastDayOfMonth } from "@/lib/utils/ym"
import type { TransactionRowData } from "@/components/budget/month/TransactionRow"

type Mode = "add" | "edit"

type DraftState = {
  type: "income" | "expense"
  category_1st: string | null
  category_2nd: string | null
  day: number | null
  payment_method: string | null
  description: string | null
  amount: number | null
  is_paid: boolean
}

function initialDraftFromRow(row: TransactionRowData): DraftState {
  return {
    type: row.type,
    category_1st: row.category_1st,
    category_2nd: row.category_2nd,
    day: Number(row.date.split("-")[2]),
    payment_method: row.payment_method,
    description: row.description,
    amount: row.amount,
    is_paid: row.is_paid,
  }
}

function emptyDraft(): DraftState {
  return {
    type: "expense",
    category_1st: null,
    category_2nd: null,
    day: null,
    payment_method: null,
    description: null,
    amount: null,
    is_paid: false,
  }
}

export function TransactionEditSheet({
  open,
  mode,
  initial,
  ym,
  categories,
  paymentMethods,
  onClose,
}: {
  open: boolean
  mode: Mode
  initial: TransactionRowData | null
  ym: string
  categories: CategoryOption[]
  paymentMethods: { id: string; name: string }[]
  onClose: () => void
}) {
  const [draft, setDraft] = useState<DraftState>(
    initial ? initialDraftFromRow(initial) : emptyDraft()
  )
  const [askDelete, setAskDelete] = useState(false)
  const [pending, startTransition] = useTransition()

  // open되거나 initial 바뀔 때 draft 리셋
  useEffect(() => {
    if (open) {
      setDraft(initial ? initialDraftFromRow(initial) : emptyDraft())
    }
  }, [open, initial])

  const save = () => {
    if (!draft.category_1st) {
      toast.error("1차 카테고리 필수")
      return
    }
    if (!draft.day || draft.day < 1 || draft.day > 31) {
      toast.error("일은 1~31")
      return
    }
    if (!draft.amount || draft.amount <= 0) {
      toast.error("금액은 양수")
      return
    }

    const maxDay = lastDayOfMonth(ym)
    const dayClamped = Math.min(draft.day, maxDay)
    const date = ymWithDay(ym, dayClamped)

    startTransition(async () => {
      if (mode === "add") {
        const result = await addTransaction({
          year_month: ym,
          date,
          type: draft.type,
          category_1st: draft.category_1st!,
          category_2nd: draft.category_2nd,
          payment_method: draft.payment_method,
          description: draft.description,
          amount: draft.amount!,
          is_paid: draft.is_paid,
        })
        if (!result.ok) {
          toast.error(result.error)
          return
        }
        toast.success("추가됨")
        onClose()
      } else {
        if (!initial) return
        const result = await updateTransaction({
          id: initial.id,
          year_month: ym,
          date,
          type: draft.type,
          category_1st: draft.category_1st!,
          category_2nd: draft.category_2nd,
          payment_method: draft.payment_method,
          description: draft.description,
          amount: draft.amount!,
          is_paid: draft.is_paid,
        })
        if (!result.ok) {
          toast.error(result.error)
          return
        }
        toast.success("저장됨")
        onClose()
      }
    })
  }

  const onConfirmDelete = () =>
    new Promise<void>((resolve) => {
      if (!initial) {
        resolve()
        return
      }
      startTransition(async () => {
        const result = await deleteTransaction({ id: initial.id })
        if (!result.ok) toast.error(result.error)
        else {
          toast.success("삭제됨")
          onClose()
        }
        resolve()
      })
    })

  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mx-auto flex max-h-[85vh] max-w-md flex-col rounded-t-xl border-t border-neutral-200 bg-white">
          <div className="mx-auto mt-2 h-1 w-12 shrink-0 rounded-full bg-neutral-300" />
          <Drawer.Title className="px-4 pt-3 text-base font-semibold">
            {mode === "add" ? "거래 추가" : "거래 편집"}
          </Drawer.Title>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            <div>
              <label className="mb-1 block text-xs text-neutral-500">종류</label>
              <Select
                value={draft.type}
                onValueChange={(v) =>
                  setDraft({
                    ...draft,
                    type: v as "income" | "expense",
                    category_1st: null,
                    category_2nd: null,
                  })
                }
              >
                <SelectTrigger className="h-11 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">출금</SelectItem>
                  <SelectItem value="income">수입</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <CategoryDropdowns
                categories={categories}
                type={draft.type}
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
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-neutral-500">일</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={draft.day ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      day: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="h-11 w-full rounded border border-neutral-300 px-3 text-base"
                  placeholder="1-31"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-500">
                  결제수단
                </label>
                <Select
                  value={draft.payment_method ?? ""}
                  onValueChange={(v) =>
                    setDraft({ ...draft, payment_method: v || null })
                  }
                >
                  <SelectTrigger className="h-11 text-base">
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
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-neutral-500">비고</label>
              <input
                type="text"
                value={draft.description ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value || null })
                }
                className="h-11 w-full rounded border border-neutral-300 px-3 text-base"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-neutral-500">금액</label>
              <input
                type="text"
                inputMode="numeric"
                value={draft.amount ? draft.amount.toLocaleString("ko-KR") : ""}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "")
                  setDraft({
                    ...draft,
                    amount: digits ? Number(digits) : null,
                  })
                }}
                className="h-11 w-full rounded border border-neutral-300 px-3 text-right text-base tabular-nums"
                placeholder="0"
              />
            </div>

            <div className="flex items-center justify-between rounded border border-neutral-200 px-3 py-2">
              <label className="text-sm">결제완료</label>
              <button
                type="button"
                onClick={() => setDraft({ ...draft, is_paid: !draft.is_paid })}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  draft.is_paid
                    ? "bg-emerald-500 text-white"
                    : "bg-neutral-200 text-neutral-600"
                )}
              >
                {draft.is_paid ? "✓ 완료" : "대기"}
              </button>
            </div>
          </div>

          <div className="flex shrink-0 gap-2 border-t border-neutral-100 px-4 py-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={pending}
              className="flex-1"
            >
              닫기
            </Button>
            {mode === "edit" && (
              <Button
                variant="destructive"
                onClick={() => setAskDelete(true)}
                disabled={pending}
              >
                삭제
              </Button>
            )}
            <Button onClick={save} disabled={pending} className="flex-1">
              {pending ? "..." : "저장"}
            </Button>
          </div>

          <DeleteConfirmDialog
            open={askDelete}
            onOpenChange={setAskDelete}
            title="거래 삭제"
            message="이 거래를 삭제합니다. 월별 요약이 자동 갱신됩니다."
            onConfirm={onConfirmDelete}
          />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
```

- [ ] **Step 2: 타입 체크**

```bash
pnpm exec tsc --noEmit
```

Expected: 0 error. (vaul 타입 + 기존 import 모두 매치)

- [ ] **Step 3: Commit**

```bash
git add components/budget/month/TransactionEditSheet.tsx
git commit -m "feat: TransactionEditSheet (vaul bottom sheet + 폼) [ADR-016, ADR-019]"
```

---

## Task 6: TransactionCardList + TransactionGroups 분기

**Files:**
- Create: `components/budget/month/TransactionCardList.tsx`
- Modify: `components/budget/month/TransactionGroups.tsx`

- [ ] **Step 1: TransactionCardList.tsx 생성**

```tsx
"use client"

import { useState } from "react"
import { TransactionCardMobile } from "@/components/budget/month/TransactionCardMobile"
import { TransactionEditSheet } from "@/components/budget/month/TransactionEditSheet"
import type { TransactionRowData } from "@/components/budget/month/TransactionRow"
import type { CategoryOption } from "@/components/budget/settings/CategoryDropdowns"
import { sortTransactionsInGroup } from "@/lib/utils/transactions-sort"

type EditingId = string | "new" | null

export function TransactionCardList({
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
  const [editingId, setEditingId] = useState<EditingId>(null)
  const sorted = sortTransactionsInGroup(transactions)
  const title = type === "expense" ? "💸 출금" : "💰 입금"

  const sheetOpen = editingId !== null
  const mode = editingId === "new" ? "add" : "edit"
  const initial =
    editingId !== "new" && editingId !== null
      ? transactions.find((t) => t.id === editingId) ?? null
      : null

  return (
    <div className="rounded border border-neutral-200">
      <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-semibold">
        {title}
      </div>

      <div className="space-y-1.5 p-2">
        {sorted.length === 0 ? (
          <p className="px-1 py-4 text-sm text-neutral-500">
            아직 거래가 없습니다.
          </p>
        ) : (
          sorted.map((row) => (
            <TransactionCardMobile
              key={row.id}
              row={row}
              onTap={() => setEditingId(row.id)}
            />
          ))
        )}

        <button
          type="button"
          onClick={() => setEditingId("new")}
          className="flex w-full items-center justify-center gap-2 rounded border-2 border-dashed border-neutral-300 py-3 text-sm font-medium text-neutral-600 hover:border-neutral-400"
        >
          <span className="text-lg leading-none">+</span>
          {type === "expense" ? "출금 추가" : "입금 추가"}
        </button>
      </div>

      <TransactionEditSheet
        open={sheetOpen}
        mode={mode}
        initial={initial}
        ym={ym}
        categories={
          // Add 모드일 때는 type을 카드 그룹 타입으로 기본 설정
          // (CategoryDropdowns는 type prop을 따라가므로 sheet 내부에서 처리)
          categories
        }
        paymentMethods={paymentMethods}
        onClose={() => setEditingId(null)}
      />
    </div>
  )
}
```

- [ ] **Step 2: TransactionGroups.tsx 교체**

```tsx
"use client"

import { TransactionTable } from "@/components/budget/month/TransactionTable"
import { TransactionCardList } from "@/components/budget/month/TransactionCardList"
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
    <>
      {/* Mobile: 카드 스택 (출금 → 입금) */}
      <div className="space-y-4 md:hidden">
        <TransactionCardList
          type="expense"
          transactions={expense}
          categories={categories}
          paymentMethods={paymentMethods}
          ym={ym}
        />
        <TransactionCardList
          type="income"
          transactions={income}
          categories={categories}
          paymentMethods={paymentMethods}
          ym={ym}
        />
      </div>

      {/* Desktop: 기존 8col 테이블 그대로 (xl: 2 column) */}
      <div className="hidden gap-4 md:grid xl:grid-cols-2">
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
    </>
  )
}
```

- [ ] **Step 3: 타입 체크**

```bash
pnpm exec tsc --noEmit
```

Expected: 0 error.

- [ ] **Step 4: 시각 확인**

`pnpm dev` 후 `/budget/2026-06`:
- 데스크탑: 8col 테이블 그대로
- 모바일 (430px): 카드 스택 보임, 카드 탭 → 시트 슬라이드업, pill 1-tap 토글 작동, "+ 출금 추가"/"+ 입금 추가" 동작

- [ ] **Step 5: Commit**

```bash
git add components/budget/month/TransactionCardList.tsx components/budget/month/TransactionGroups.tsx
git commit -m "feat: TransactionCardList + TransactionGroups 반응형 분기 [ADR-016, ADR-020]"
```

---

## Task 7: 메인 페이지 padding/typography 반응형

**Files:**
- Modify: `app/budget/[ym]/page.tsx`

- [ ] **Step 1: page.tsx 수정**

기존 `app/budget/[ym]/page.tsx` 의 return JSX에서 wrapper와 h1 변경:

```tsx
// Before
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">{formatYmKorean(params.ym)}</h1>

// After
  return (
    <div className="space-y-4 p-3 md:space-y-6 md:p-6">
      <h1 className="text-xl font-bold md:text-2xl">{formatYmKorean(params.ym)}</h1>
```

`NoMonthYet` 함수도 반응형 적용:

```tsx
function NoMonthYet({ ym }: { ym: string }) {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h1 className="text-xl font-bold md:text-2xl">{formatYmKorean(ym)}</h1>
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

- [ ] **Step 2: 타입 체크**

```bash
pnpm exec tsc --noEmit
```

Expected: 0 error.

- [ ] **Step 3: 시각 확인**

`pnpm dev` 후 `/budget/2026-06`:
- 모바일: 좌우 패딩 12px (절반), h1 작게
- 데스크탑: 그대로

- [ ] **Step 4: Commit**

```bash
git add app/budget/[ym]/page.tsx
git commit -m "feat: /budget/[ym] 페이지 패딩/타이포 반응형"
```

---

## Task 8: FixedExpenseCardMobile

**Files:**
- Create: `components/budget/settings/FixedExpenseCardMobile.tsx`

- [ ] **Step 1: 새 파일 생성**

```tsx
"use client"

import { useState, useTransition } from "react"
import { cn } from "@/lib/utils"
import { updateFixedExpense } from "@/lib/actions/fixed-expenses"
import { toast } from "sonner"
import type { FixedExpenseRow } from "@/components/budget/settings/FixedExpenseRow"

const krwFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
})

export function FixedExpenseCardMobile({
  row,
  onTap,
}: {
  row: FixedExpenseRow
  onTap: () => void
}) {
  const [active, setActive] = useState(row.active)
  const [pending, startTransition] = useTransition()

  const onToggleActive = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (row.id.startsWith("temp-")) return // 미저장 행은 시트로
    const next = !active
    setActive(next)
    startTransition(async () => {
      const result = await updateFixedExpense({ id: row.id, active: next })
      if (!result.ok) {
        setActive(!next)
        toast.error(result.error)
      }
    })
  }

  const dayLabel =
    row.day_of_month === null
      ? "—"
      : row.day_of_month === 0
        ? "날짜 미정"
        : `매월 ${row.day_of_month}일`

  return (
    <div
      className={cn(
        "relative flex flex-col gap-1 rounded border border-neutral-200 bg-white px-3 py-2.5",
        !active && "opacity-50"
      )}
    >
      {/* Row 1: 카테고리 + 일 */}
      <div className="flex items-center justify-between">
        <span className="truncate pr-2 text-sm font-medium">
          {row.category_1st ?? "—"}
          {row.category_2nd ? (
            <>
              <span className="mx-1 text-neutral-400">▸</span>
              {row.category_2nd}
            </>
          ) : null}
        </span>
        <span className="shrink-0 text-xs text-neutral-500">{dayLabel}</span>
      </div>

      {/* Row 2: 종류 · 결제수단 · 비고 */}
      <div className="truncate text-xs text-neutral-500">
        {row.type === "income" ? "수입" : "출금"} · {row.payment_method ?? "—"}
        {row.description ? ` · ${row.description}` : ""}
      </div>

      {/* Row 3: 금액 + active pill */}
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-base font-semibold tabular-nums",
            row.type === "income" ? "text-emerald-600" : "text-neutral-900"
          )}
        >
          {row.amount === null || row.amount === 0
            ? "—"
            : krwFormatter.format(row.amount)}
        </span>
        <button
          type="button"
          onClick={onToggleActive}
          disabled={pending}
          className={cn(
            "relative z-10 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            active
              ? "bg-emerald-500 text-white"
              : "bg-neutral-200 text-neutral-600"
          )}
          aria-label={active ? "활성" : "비활성"}
        >
          {active ? "✓ 활성" : "비활성"}
        </button>
      </div>

      {/* 카드 전체 탭 영역 */}
      <button
        type="button"
        onClick={onTap}
        className="absolute inset-0 rounded"
        aria-label="고정지출 편집"
      >
        <span className="sr-only">편집</span>
      </button>
    </div>
  )
}
```

- [ ] **Step 2: 타입 체크**

```bash
pnpm exec tsc --noEmit
```

Expected: 0 error.

- [ ] **Step 3: Commit**

```bash
git add components/budget/settings/FixedExpenseCardMobile.tsx
git commit -m "feat: FixedExpenseCardMobile 컴포넌트 [ADR-016]"
```

---

## Task 9: FixedExpenseEditSheet

**Files:**
- Create: `components/budget/settings/FixedExpenseEditSheet.tsx`

- [ ] **Step 1: 새 파일 생성**

```tsx
"use client"

import { useState, useTransition, useEffect } from "react"
import { Drawer } from "vaul"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CategoryDropdowns,
  type CategoryOption,
} from "@/components/budget/settings/CategoryDropdowns"
import { DeleteConfirmDialog } from "@/components/budget/settings/DeleteConfirmDialog"
import {
  addFixedExpense,
  updateFixedExpense,
  deleteFixedExpense,
} from "@/lib/actions/fixed-expenses"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { FixedExpenseRow } from "@/components/budget/settings/FixedExpenseRow"

type Mode = "add" | "edit"

type DraftState = {
  type: "income" | "expense"
  category_1st: string | null
  category_2nd: string | null
  day_of_month: number | null
  payment_method: string | null
  description: string | null
  amount: number | null
  active: boolean
}

function initialDraftFromRow(row: FixedExpenseRow): DraftState {
  return {
    type: row.type,
    category_1st: row.category_1st,
    category_2nd: row.category_2nd,
    day_of_month: row.day_of_month,
    payment_method: row.payment_method,
    description: row.description,
    amount: row.amount,
    active: row.active,
  }
}

function emptyDraft(): DraftState {
  return {
    type: "expense",
    category_1st: null,
    category_2nd: null,
    day_of_month: null,
    payment_method: null,
    description: null,
    amount: null,
    active: true,
  }
}

export function FixedExpenseEditSheet({
  open,
  mode,
  initial,
  categories,
  paymentMethods,
  onClose,
}: {
  open: boolean
  mode: Mode
  initial: FixedExpenseRow | null
  categories: CategoryOption[]
  paymentMethods: { id: string; name: string }[]
  onClose: () => void
}) {
  const [draft, setDraft] = useState<DraftState>(
    initial ? initialDraftFromRow(initial) : emptyDraft()
  )
  const [askDelete, setAskDelete] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (open) {
      setDraft(initial ? initialDraftFromRow(initial) : emptyDraft())
    }
  }, [open, initial])

  const save = () => {
    if (!draft.category_1st) {
      toast.error("1차 카테고리 필수")
      return
    }
    if (draft.day_of_month === null || draft.day_of_month < 0 || draft.day_of_month > 31) {
      toast.error("일은 0~31")
      return
    }
    if (draft.amount === null || draft.amount < 0) {
      toast.error("금액은 0 이상")
      return
    }

    startTransition(async () => {
      if (mode === "add") {
        const result = await addFixedExpense({
          day_of_month: draft.day_of_month!,
          type: draft.type,
          category_1st: draft.category_1st!,
          category_2nd: draft.category_2nd,
          payment_method: draft.payment_method,
          description: draft.description,
          amount: draft.amount!,
        })
        if (!result.ok) {
          toast.error(result.error)
          return
        }
        toast.success("추가됨")
        onClose()
      } else {
        if (!initial || initial.id.startsWith("temp-")) return
        const result = await updateFixedExpense({
          id: initial.id,
          day_of_month: draft.day_of_month!,
          type: draft.type,
          category_1st: draft.category_1st!,
          category_2nd: draft.category_2nd,
          payment_method: draft.payment_method,
          description: draft.description,
          amount: draft.amount!,
          active: draft.active,
        })
        if (!result.ok) {
          toast.error(result.error)
          return
        }
        toast.success("저장됨")
        onClose()
      }
    })
  }

  const onConfirmDelete = () =>
    new Promise<void>((resolve) => {
      if (!initial || initial.id.startsWith("temp-")) {
        resolve()
        return
      }
      startTransition(async () => {
        const result = await deleteFixedExpense({ id: initial.id })
        if (!result.ok) toast.error(result.error)
        else {
          toast.success("삭제됨")
          onClose()
        }
        resolve()
      })
    })

  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mx-auto flex max-h-[85vh] max-w-md flex-col rounded-t-xl border-t border-neutral-200 bg-white">
          <div className="mx-auto mt-2 h-1 w-12 shrink-0 rounded-full bg-neutral-300" />
          <Drawer.Title className="px-4 pt-3 text-base font-semibold">
            {mode === "add" ? "고정지출 추가" : "고정지출 편집"}
          </Drawer.Title>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            <div>
              <label className="mb-1 block text-xs text-neutral-500">종류</label>
              <Select
                value={draft.type}
                onValueChange={(v) =>
                  setDraft({
                    ...draft,
                    type: v as "income" | "expense",
                    category_1st: null,
                    category_2nd: null,
                  })
                }
              >
                <SelectTrigger className="h-11 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">출금</SelectItem>
                  <SelectItem value="income">수입</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <CategoryDropdowns
                categories={categories}
                type={draft.type}
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
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-neutral-500">
                  일 (0=날짜 미정)
                </label>
                <input
                  type="number"
                  min={0}
                  max={31}
                  value={draft.day_of_month ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      day_of_month: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="h-11 w-full rounded border border-neutral-300 px-3 text-base"
                  placeholder="0-31"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-500">
                  결제수단
                </label>
                <Select
                  value={draft.payment_method ?? ""}
                  onValueChange={(v) =>
                    setDraft({ ...draft, payment_method: v || null })
                  }
                >
                  <SelectTrigger className="h-11 text-base">
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
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-neutral-500">비고</label>
              <input
                type="text"
                value={draft.description ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value || null })
                }
                className="h-11 w-full rounded border border-neutral-300 px-3 text-base"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-neutral-500">금액</label>
              <input
                type="text"
                inputMode="numeric"
                value={draft.amount ? draft.amount.toLocaleString("ko-KR") : ""}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "")
                  setDraft({
                    ...draft,
                    amount: digits ? Number(digits) : null,
                  })
                }}
                className="h-11 w-full rounded border border-neutral-300 px-3 text-right text-base tabular-nums"
                placeholder="0"
              />
            </div>

            <div className="flex items-center justify-between rounded border border-neutral-200 px-3 py-2">
              <label className="text-sm">활성</label>
              <button
                type="button"
                onClick={() => setDraft({ ...draft, active: !draft.active })}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  draft.active
                    ? "bg-emerald-500 text-white"
                    : "bg-neutral-200 text-neutral-600"
                )}
              >
                {draft.active ? "✓ 활성" : "비활성"}
              </button>
            </div>
          </div>

          <div className="flex shrink-0 gap-2 border-t border-neutral-100 px-4 py-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={pending}
              className="flex-1"
            >
              닫기
            </Button>
            {mode === "edit" && (
              <Button
                variant="destructive"
                onClick={() => setAskDelete(true)}
                disabled={pending}
              >
                삭제
              </Button>
            )}
            <Button onClick={save} disabled={pending} className="flex-1">
              {pending ? "..." : "저장"}
            </Button>
          </div>

          <DeleteConfirmDialog
            open={askDelete}
            onOpenChange={setAskDelete}
            title="고정지출 삭제"
            message="이 고정지출을 삭제합니다. 이미 생성된 거래는 영향 없음."
            onConfirm={onConfirmDelete}
          />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
```

- [ ] **Step 2: 타입 체크**

```bash
pnpm exec tsc --noEmit
```

Expected: 0 error.

- [ ] **Step 3: Commit**

```bash
git add components/budget/settings/FixedExpenseEditSheet.tsx
git commit -m "feat: FixedExpenseEditSheet (vaul bottom sheet + 폼) [ADR-016, ADR-019]"
```

---

## Task 10: FixedExpenseCardList + 설정 페이지 분기

**Files:**
- Create: `components/budget/settings/FixedExpenseCardList.tsx`
- Modify: `app/budget/settings/fixed-expenses/page.tsx`

- [ ] **Step 1: FixedExpenseCardList.tsx 생성**

```tsx
"use client"

import { useState } from "react"
import { FixedExpenseCardMobile } from "@/components/budget/settings/FixedExpenseCardMobile"
import { FixedExpenseEditSheet } from "@/components/budget/settings/FixedExpenseEditSheet"
import type { FixedExpenseRow } from "@/components/budget/settings/FixedExpenseRow"
import type { CategoryOption } from "@/components/budget/settings/CategoryDropdowns"

type EditingId = string | "new" | null

export function FixedExpenseCardList({
  rows,
  categories,
  paymentMethods,
}: {
  rows: FixedExpenseRow[]
  categories: CategoryOption[]
  paymentMethods: { id: string; name: string }[]
}) {
  const [editingId, setEditingId] = useState<EditingId>(null)

  const sheetOpen = editingId !== null
  const mode = editingId === "new" ? "add" : "edit"
  const initial =
    editingId !== "new" && editingId !== null
      ? rows.find((r) => r.id === editingId) ?? null
      : null

  return (
    <div className="space-y-1.5">
      {rows.length === 0 ? (
        <p className="px-1 py-4 text-sm text-neutral-500">
          아직 고정지출이 없습니다.
        </p>
      ) : (
        rows.map((row) => (
          <FixedExpenseCardMobile
            key={row.id}
            row={row}
            onTap={() => setEditingId(row.id)}
          />
        ))
      )}

      <button
        type="button"
        onClick={() => setEditingId("new")}
        className="flex w-full items-center justify-center gap-2 rounded border-2 border-dashed border-neutral-300 py-3 text-sm font-medium text-neutral-600 hover:border-neutral-400"
      >
        <span className="text-lg leading-none">+</span>
        고정지출 추가
      </button>

      <FixedExpenseEditSheet
        open={sheetOpen}
        mode={mode}
        initial={initial}
        categories={categories}
        paymentMethods={paymentMethods}
        onClose={() => setEditingId(null)}
      />
    </div>
  )
}
```

- [ ] **Step 2: app/budget/settings/fixed-expenses/page.tsx 교체**

```tsx
import { createClient } from "@/lib/supabase/server"
import { FixedExpenseTable } from "@/components/budget/settings/FixedExpenseTable"
import { FixedExpenseCardList } from "@/components/budget/settings/FixedExpenseCardList"
import type { FixedExpenseRow } from "@/components/budget/settings/FixedExpenseRow"
import type { CategoryOption } from "@/components/budget/settings/CategoryDropdowns"

export default async function FixedExpensesPage() {
  const supabase = await createClient()

  const [
    { data: fixedExpenses, error: fxErr },
    { data: categories, error: catErr },
    { data: paymentMethods, error: pmErr },
  ] = await Promise.all([
    supabase
      .from("fixed_expenses")
      .select(
        "id, day_of_month, type, category_1st, category_2nd, payment_method, description, amount, active"
      )
      .order("day_of_month", { ascending: true })
      .order("id", { ascending: true }),
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

  if (fxErr || catErr || pmErr) {
    const msg = fxErr?.message ?? catErr?.message ?? pmErr?.message
    return <p className="text-sm text-red-600">에러: {msg}</p>
  }

  const rows: FixedExpenseRow[] = (fixedExpenses ?? []).map((r) => ({
    id: r.id,
    day_of_month: r.day_of_month,
    type: r.type as "income" | "expense",
    category_1st: r.category_1st,
    category_2nd: r.category_2nd,
    payment_method: r.payment_method,
    description: r.description,
    amount: r.amount === null ? null : Number(r.amount),
    active: r.active,
  }))

  const cats: CategoryOption[] = (categories ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type as "income" | "expense",
    parent_id: c.parent_id,
  }))

  return (
    <div className="space-y-4 p-3 md:space-y-6 md:p-6">
      <h1 className="text-xl font-bold md:text-2xl">고정지출 관리</h1>

      {/* Mobile: 카드 스택 */}
      <div className="md:hidden">
        <FixedExpenseCardList
          rows={rows}
          categories={cats}
          paymentMethods={paymentMethods ?? []}
        />
      </div>

      {/* Desktop: 기존 테이블 */}
      <div className="hidden md:block">
        <FixedExpenseTable
          rows={rows}
          categories={cats}
          paymentMethods={paymentMethods ?? []}
        />
      </div>
    </div>
  )
}
```

(주의: 기존 page.tsx에는 wrapper `<div>` 가 없었고 컴포넌트 결과를 직접 return함. 위 코드는 wrapper 추가 + 모바일/데스크탑 분기. 기존 h1 없었으면 추가 — 화면 일관성 위함.)

- [ ] **Step 3: 타입 체크**

```bash
pnpm exec tsc --noEmit
```

Expected: 0 error.

- [ ] **Step 4: 시각 확인**

`/budget/settings/fixed-expenses`:
- 데스크탑: 기존 9col 테이블 그대로
- 모바일: 카드 스택, 활성 pill 1-tap 토글, 카드 탭 → 시트, "+ 고정지출 추가" 동작

- [ ] **Step 5: Commit**

```bash
git add components/budget/settings/FixedExpenseCardList.tsx app/budget/settings/fixed-expenses/page.tsx
git commit -m "feat: FixedExpenseCardList + 설정 페이지 반응형 분기 [ADR-016, ADR-020]"
```

---

## Task 11: 최종 manual gates (A-E)

**검증**: 모든 task 완료 후, dev server 띄우고 Chrome DevTools iPhone 14 Pro Max (430×932) + 데스크탑 (1280×800) 두 viewport에서 확인.

### Gate A: Build + Type
- [ ] `pnpm run build` 통과 (warning OK, error X)
- [ ] `pnpm exec tsc --noEmit` 0 error
- [ ] `pnpm exec eslint .` 0 error

```bash
pnpm run build && pnpm exec tsc --noEmit && pnpm exec eslint .
```

### Gate B: 모바일 시각 (430×932)
**경로**: `/budget/2026-06`

- [ ] 페이지 가로 스크롤 없음
- [ ] Hero "예상 잔고" 카드 (큰 텍스트) 한 줄 가득
- [ ] 6개 카드가 2col grid 로 정렬, 모든 ₩값 풀로 보임 (잘림 X)
- [ ] 출금 섹션 → 입금 섹션 순서 세로 배치
- [ ] 고정지출 카드 좌측 파란 보더 보임
- [ ] "+ 출금 추가" / "+ 입금 추가" 점선 버튼 보임

### Gate C: 모바일 인터랙션 (메인)
- [ ] 거래 카드 본문(pill 제외 영역) 탭 → 시트 슬라이드업
- [ ] 시트에서 일/금액 수정 → 저장 → 시트 닫힘 → 카드 갱신, 요약카드 재계산
- [ ] 카드 내 `[✓ 완료] / [대기]` pill 1-tap → 시트 안 열리고 즉시 토글, 토스트
- [ ] 시트 위로 드래그 → 더 커짐, 아래로 드래그 → 닫힘 (변경 silent discard)
- [ ] "+ 출금 추가" → 빈 시트 (type=expense 기본) → 카테고리/일/금액 입력 → 저장 → 새 카드 출금 섹션에 추가
- [ ] "+ 입금 추가" → 빈 시트 → type을 수입으로 바꾸기 (또는 자동 — sheet 내부 type select로 변경) → 저장 → 입금 섹션에 추가
- [ ] 시트 내 삭제 → 확인 다이얼로그 → 카드 제거 + 요약카드 재계산

### Gate D: 데스크탑 회귀 (>= 768px)
**경로**: `/budget/2026-06`

- [ ] 8col 인라인 테이블 그대로 (변경 없어야 함)
- [ ] 요약카드 한 줄 7개 (`grid-cols-7`)
- [ ] 인라인 카테고리/일/금액 수정 → 즉시 반영
- [ ] `[✓ 완료]/[대기]` pill 동작

**경로**: `/budget/settings/fixed-expenses`
- [ ] 9col 인라인 테이블 그대로
- [ ] `[✓ 활성]/[비활성]` pill, 인라인 수정, 삭제 동작

### Gate E: 고정지출 모바일
**경로**: `/budget/settings/fixed-expenses` (430×932)

- [ ] 9col 테이블 안 보임, 카드 스택 보임
- [ ] 카드의 `[✓ 활성]/[비활성]` pill 1-tap → 즉시 토글
- [ ] 카드 본문 탭 → 시트 슬라이드업
- [ ] 시트 안 폼: 일=0 허용, 금액=0 허용 (저장 가능)
- [ ] "+ 고정지출 추가" → 빈 시트 → 저장 → 새 카드 추가

### 게이트 모두 통과 시
- [ ] Notion ADR 업데이트 알림 사용자에게 전달:

```
⚠️ Notion 업데이트 필요: ADR-016 ~ ADR-020 (총 5개)
- 016: 모바일 거래 UI = Card stack + Bottom sheet
- 017: Breakpoint = Tailwind md (768px)
- 018: MonthlySummary 모바일 = Hero(예상잔고) + 6card 2col
- 019: vaul 라이브러리 도입
- 020: 모바일/데스크탑 = 동시 SSR + CSS 분기 패턴
```

---

## Self-Review 노트 (작성자용)

**Spec coverage 확인**:
- §2.1 Responsive 분기 → Task 3, 6, 10
- §2.2 Breakpoint md → 모든 task의 className에 반영
- §2.3 모바일 거래 UI → Task 4, 5, 6
- §2.4 MonthlySummary hero+2col → Task 3
- §2.5 vaul → Task 1, 5, 9
- §3 컴포넌트 분해 → 각 Task에 1:1 매핑
- §4 Data flow → Task 5, 6, 9, 10 코드에 구현됨
- §5 Card 디자인 → Task 4, 8 의 className 패턴
- §6 시트 폼 → Task 5, 9
- §7 페이지 레벨 → Task 7, 10
- §9 게이트 → Task 11

**잠재 위험**:
- vaul Drawer가 Next.js 14 + React 18에서 hydration 문제 일으킬 가능성 → Drawer.Portal 사용으로 회피 (vaul 공식 패턴)
- TransactionEditSheet의 type "수입/출금" 변경 시 1차 카테고리 리셋 — 카드 그룹 type과 무관하게 sheet 내부에서 자유 변경 가능 (사용자가 grouping 미스해도 sheet에서 수정 가능)
- `addTransaction` schema는 `amount: z.number().positive()` (양수만) — 시트 폼이 0 또는 빈값 차단 (이미 위에 토스트 처리)
- `addFixedExpense` schema는 `amount >= 0`, `day_of_month: 0~31` (이미 ADR-015) — 시트 차단 로직 동일

**Type 일관성**:
- `TransactionRowData` (TransactionRow.tsx의 export type) — Card/Sheet/List에서 모두 동일 import
- `FixedExpenseRow` (FixedExpenseRow.tsx의 export type) — 동일
- `CategoryOption` (CategoryDropdowns.tsx의 export type) — 동일
- vaul 타입 — vaul 패키지 내장

**Placeholder 스캔**: 통과 — TBD/TODO 없음, 모든 코드 블록은 즉시 실행 가능.

---

## 실행 방식 선택

Plan 완료 — `docs/superpowers/plans/2026-06-01-mobile-responsive.md`.

두 가지 실행 옵션:

**1. Subagent-Driven (추천, 이전 Phase 4b-2 패턴)** — task 1개씩 fresh subagent 디스패치, 각 task 후 spec 준수 리뷰 + 코드 품질 리뷰. 빠른 반복.

**2. Inline Execution** — 같은 세션에서 task 일괄 실행, 체크포인트마다 사용자 확인.

어느 쪽?
