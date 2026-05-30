# Phase 4b-1: 사이드바 + 월별 라우팅 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자가 사이드바 트리로 월간 페이지 사이를 네비게이션하고 "+ 다음 월 생성"으로 새 월(monthly_summaries row)을 만들 수 있는 상태를 만든다.

**Architecture:** Next 14 App Router dynamic segment `/budget/[ym]/`. `app/budget/layout.tsx`가 모든 `/budget/*` 페이지에 사이드바 마운트 (설정 페이지도 포함). 사이드바는 server 데이터 fetch + client 인터랙션 분리. "+ 생성" 버튼은 idempotent server action `createNextMonth`로 monthly_summaries row만 INSERT (opening_balance = 직전월 current_balance 이월).

**Tech Stack:** Next.js 14, TypeScript, Tailwind, shadcn/ui (Phase 4a 자산 재활용), `@supabase/ssr`, Zod. **신규 의존성 없음.**

**Spec:** `docs/superpowers/specs/2026-05-30-phase4b1-sidebar-and-routing-design.md`

---

## 사전 상태

- 디렉토리: `/Users/seungsoosmacbook/Desktop/seungsoo-life/`
- 최근 커밋: `c1a5a79 docs: Phase 4b-1 사이드바 + 월별 라우팅 설계 spec 작성`
- Phase 4a 완료: 인증 + 설정 3개 화면 (categories/payment-methods/fixed-expenses)
- Supabase: 카테고리 36개, 결제수단 4개, 고정지출 1개, profiles 1개 (Gate B/C/D 동안 입력됨)
- Phase 3 트리거: `transactions` INSERT/UPDATE/DELETE 시 `monthly_summaries` 자동 재계산 (잔고 cascade)
- 기존 `app/budget/page.tsx`는 Phase 2의 placeholder ("준비 중입니다")
- 기존 `components/budget/settings/`에 8개 컴포넌트 (Phase 4a)
- `pnpm build`, `pnpm lint`, `pnpm exec tsc --noEmit` 모두 통과 상태

## 파일 구조 (Phase 4b-1 종료 시)

| 경로 | 책임 | 만드는 Task |
|---|---|---|
| `lib/utils/ym.ts` | year_month 유틸 6개 (isValidYm, getCurrentYm, getNextYm, getPrevYm, parseYm, formatYmKorean) | Task 1 |
| `lib/actions/budget-months.ts` | `createNextMonth` server action (idempotent, opening 직전월 이월) | Task 2 |
| `app/budget/page.tsx` (수정) | placeholder → `redirect(/budget/<currentYm>)` | Task 3 |
| `components/budget/sidebar/CreateMonthButton.tsx` | client component, server action 호출 (sidebar variant + primary variant) | Task 4 |
| `app/budget/[ym]/page.tsx` | server, ym 검증 + monthly_summaries fetch + MonthHeader/NoMonthYet 분기 | Task 5 |
| `components/budget/sidebar/MonthLink.tsx` | client, ⭐ + 굵게 활성 표시 | Task 6 |
| `components/budget/sidebar/SidebarTree.tsx` | client, year 토글 + 햄버거 토글 + MonthLink/CreateMonthButton 조립 | Task 7 |
| `components/budget/sidebar/Sidebar.tsx` | server, monthly_summaries + transactions fetch + year 그룹화 + createTarget 계산 | Task 8 |
| `app/budget/layout.tsx` | 모든 /budget/* 공통 layout, Sidebar 마운트 | Task 8 |

총 신규 8 + 수정 1.

---

## Task 1: `lib/utils/ym.ts` 작성

**Files:**
- Create: `lib/utils/ym.ts`

**Working directory:** `/Users/seungsoosmacbook/Desktop/seungsoo-life/`

- [ ] **Step 1: 디렉토리 생성**

Run:
```bash
mkdir -p /Users/seungsoosmacbook/Desktop/seungsoo-life/lib/utils
```

- [ ] **Step 2: ym.ts 작성**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/lib/utils/ym.ts`:

```ts
/**
 * year_month (YYYY-MM) 유틸. 모두 순수 함수.
 * 가계부 모듈의 모든 월 식별자는 이 형식 사용.
 */

/** YYYY-MM 형식 검증 (월은 01-12) */
export function isValidYm(ym: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(ym)
}

/** 현재 년월 (KST 기준). Vercel UTC 환경 안전. */
export function getCurrentYm(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  })
  // en-CA locale은 ISO-like 형식 "2026-05" 형태로 출력
  return formatter.format(new Date())
}

/** "2026-05" → { year: 2026, month: 5 } */
export function parseYm(ym: string): { year: number; month: number } {
  const [y, m] = ym.split("-")
  return { year: Number(y), month: Number(m) }
}

/** 다음 월 ("2026-12" → "2027-01") */
export function getNextYm(ym: string): string {
  const { year, month } = parseYm(ym)
  const next =
    month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
  return `${next.year}-${String(next.month).padStart(2, "0")}`
}

/** 직전 월 ("2026-01" → "2025-12") */
export function getPrevYm(ym: string): string {
  const { year, month } = parseYm(ym)
  const prev =
    month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
  return `${prev.year}-${String(prev.month).padStart(2, "0")}`
}

/** "2026-05" → "2026년 5월" */
export function formatYmKorean(ym: string): string {
  const { year, month } = parseYm(ym)
  return `${year}년 ${month}월`
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

Expected: 두 가지 모두 통과. 새 파일은 아직 import되지 않아서 tree-shaken 가능성 있음 (괜찮음).

**중요: 빌드 실패한 상태로 커밋 금지.**

- [ ] **Step 4: 커밋**

```bash
cd /Users/seungsoosmacbook/Desktop/seungsoo-life
git add lib/utils/ym.ts
git commit -m "feat(utils): ym (year_month) 유틸 6개 작성 (KST 강제)"
```

---

## Task 2: `createNextMonth` server action

**Files:**
- Create: `lib/actions/budget-months.ts`

**Working directory:** `/Users/seungsoosmacbook/Desktop/seungsoo-life/`

- [ ] **Step 1: budget-months.ts 작성**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/lib/actions/budget-months.ts`:

```ts
"use server"

import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { getPrevYm } from "@/lib/utils/ym"

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

  // 직전 월 잔고 (없으면 0)
  const prevYm = getPrevYm(parsed.data.ym)
  const { data: prev } = await supabase
    .from("monthly_summaries")
    .select("current_balance")
    .eq("year_month", prevYm)
    .maybeSingle()

  const opening = prev?.current_balance ?? 0

  const { error } = await supabase.from("monthly_summaries").insert({
    user_id: user.id,
    year_month: parsed.data.ym,
    opening_balance: opening,
    current_balance: opening,
    expected_balance: opening,
    // income_total, expense_total, paid_total, unpaid_total은 DB default 0
  })

  if (error) return { ok: false, error: error.message }
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

Expected: 통과. Supabase `database.ts` 타입으로 `monthly_summaries` 추론.

**중요: 빌드 실패한 상태로 커밋 금지.**

- [ ] **Step 3: 커밋**

```bash
git add lib/actions/budget-months.ts
git commit -m "feat(budget-months): createNextMonth server action (idempotent, opening 직전월 이월)"
```

---

## Task 3: `app/budget/page.tsx` 수정 (placeholder → redirect)

**Files:**
- Modify: `app/budget/page.tsx` (전면 교체)

**Working directory:** `/Users/seungsoosmacbook/Desktop/seungsoo-life/`

- [ ] **Step 1: page.tsx 전면 교체**

기존 placeholder 내용 무시. 다음으로 교체:

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/app/budget/page.tsx`:

```tsx
import { redirect } from "next/navigation"
import { getCurrentYm } from "@/lib/utils/ym"

export default function BudgetPage() {
  redirect(`/budget/${getCurrentYm()}`)
}
```

- [ ] **Step 2: 빌드 검증**

Run:
```bash
cd /Users/seungsoosmacbook/Desktop/seungsoo-life
pnpm build 2>&1 | tail -8
```

Expected: 빌드 성공. `/budget` 라우트가 (Static) 또는 (Dynamic)으로 표시.

- [ ] **Step 3: dev 서버에서 redirect 확인 (선택)**

이 단계는 백그라운드 테스트:
```bash
cd /Users/seungsoosmacbook/Desktop/seungsoo-life
pnpm dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
sleep 6
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/budget
kill $DEV_PID 2>/dev/null
sleep 1
```

Expected: 미인증 상태면 `/signin` redirect, 인증 상태면 `/budget/<currentYm>` redirect. 어느 쪽이든 307 코드.

**중요: 빌드 실패한 상태로 커밋 금지.**

- [ ] **Step 4: 커밋**

```bash
git add app/budget/page.tsx
git commit -m "feat(budget): /budget → /budget/<currentYm> redirect (메인 자동 이동)"
```

---

## Task 4: `CreateMonthButton.tsx` (client component)

**Files:**
- Create: `components/budget/sidebar/CreateMonthButton.tsx`

**Working directory:** `/Users/seungsoosmacbook/Desktop/seungsoo-life/`

- [ ] **Step 1: 디렉토리 생성**

Run:
```bash
mkdir -p /Users/seungsoosmacbook/Desktop/seungsoo-life/components/budget/sidebar
```

- [ ] **Step 2: CreateMonthButton.tsx 작성**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/components/budget/sidebar/CreateMonthButton.tsx`:

```tsx
"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { createNextMonth } from "@/lib/actions/budget-months"
import { toast } from "sonner"

export function CreateMonthButton({
  ym,
  label,
  variant = "sidebar",
}: {
  ym: string
  label: string
  variant?: "sidebar" | "primary"
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const handleClick = () => {
    startTransition(async () => {
      const result = await createNextMonth({ ym })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      router.push(`/budget/${ym}`)
    })
  }

  if (variant === "primary") {
    return (
      <Button onClick={handleClick} disabled={pending} size="lg">
        {pending ? "생성 중..." : label}
      </Button>
    )
  }

  // sidebar variant
  return (
    <Button
      onClick={handleClick}
      disabled={pending}
      variant="outline"
      size="sm"
      className="w-full"
    >
      {pending ? "생성 중..." : label}
    </Button>
  )
}
```

- [ ] **Step 3: 빌드 검증**

Run:
```bash
cd /Users/seungsoosmacbook/Desktop/seungsoo-life
pnpm exec tsc --noEmit 2>&1 | tail -3
echo "TSC EXIT: $?"
pnpm build 2>&1 | tail -5
```

Expected: 통과 (아직 import 안 되어서 tree-shaken).

**중요: 빌드 실패한 상태로 커밋 금지.**

- [ ] **Step 4: 커밋**

```bash
git add components/budget/sidebar/CreateMonthButton.tsx
git commit -m "feat(budget-sidebar): CreateMonthButton (sidebar + primary variant)"
```

---

## Task 5: `app/budget/[ym]/page.tsx` + MonthHeader + NoMonthYet

**Files:**
- Create: `app/budget/[ym]/page.tsx`

**Working directory:** `/Users/seungsoosmacbook/Desktop/seungsoo-life/`

- [ ] **Step 1: 디렉토리 생성**

Run:
```bash
mkdir -p /Users/seungsoosmacbook/Desktop/seungsoo-life/app/budget/[ym]
```

- [ ] **Step 2: [ym]/page.tsx 작성**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/app/budget/[ym]/page.tsx`:

```tsx
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { isValidYm, formatYmKorean } from "@/lib/utils/ym"
import { CreateMonthButton } from "@/components/budget/sidebar/CreateMonthButton"

export default async function MonthPage({
  params,
}: {
  params: { ym: string }
}) {
  if (!isValidYm(params.ym)) notFound()

  const supabase = await createClient()
  const { data: summary } = await supabase
    .from("monthly_summaries")
    .select("year_month")
    .eq("year_month", params.ym)
    .maybeSingle()

  if (!summary) {
    return <NoMonthYet ym={params.ym} />
  }

  return <MonthHeader ym={params.ym} />
}

function MonthHeader({ ym }: { ym: string }) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">{formatYmKorean(ym)}</h1>
      <p className="mt-4 text-sm text-neutral-500">
        거래 입력은 다음 Phase에서 추가됩니다.
      </p>
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

- [ ] **Step 3: 빌드 검증**

Run:
```bash
cd /Users/seungsoosmacbook/Desktop/seungsoo-life
pnpm exec tsc --noEmit 2>&1 | tail -3
echo "TSC EXIT: $?"
pnpm build 2>&1 | tail -8
```

Expected: 빌드 성공. `/budget/[ym]` 라우트가 (Dynamic, ƒ)로 표시.

**중요: 빌드 실패한 상태로 커밋 금지.**

- [ ] **Step 4: 커밋**

```bash
git add app/budget/[ym]/page.tsx
git commit -m "feat(budget): /budget/[ym] 동적 라우트 + MonthHeader + NoMonthYet 분기"
```

---

## Task 6: `MonthLink.tsx` (client component)

**Files:**
- Create: `components/budget/sidebar/MonthLink.tsx`

**Working directory:** `/Users/seungsoosmacbook/Desktop/seungsoo-life/`

- [ ] **Step 1: MonthLink.tsx 작성**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/components/budget/sidebar/MonthLink.tsx`:

```tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { parseYm } from "@/lib/utils/ym"

export function MonthLink({
  ym,
  isCurrent,
}: {
  ym: string
  isCurrent: boolean
}) {
  const pathname = usePathname()
  const isActive = pathname === `/budget/${ym}`
  const { month } = parseYm(ym)

  return (
    <Link
      href={`/budget/${ym}`}
      className={cn(
        "block rounded px-2 py-1 text-sm transition-colors",
        isActive
          ? "bg-neutral-100 font-bold text-neutral-900"
          : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
      )}
    >
      {isCurrent ? "⭐ " : "ㆍ "}
      {month}월
    </Link>
  )
}
```

- [ ] **Step 2: 빌드 검증**

Run:
```bash
cd /Users/seungsoosmacbook/Desktop/seungsoo-life
pnpm exec tsc --noEmit 2>&1 | tail -3 ; echo "TSC EXIT: $?"
pnpm build 2>&1 | tail -5
```

Expected: 통과.

**중요: 빌드 실패한 상태로 커밋 금지.**

- [ ] **Step 3: 커밋**

```bash
git add components/budget/sidebar/MonthLink.tsx
git commit -m "feat(budget-sidebar): MonthLink (⭐ + 굵게 활성 표시)"
```

---

## Task 7: `SidebarTree.tsx` (client component)

**Files:**
- Create: `components/budget/sidebar/SidebarTree.tsx`

**Working directory:** `/Users/seungsoosmacbook/Desktop/seungsoo-life/`

- [ ] **Step 1: SidebarTree.tsx 작성**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/components/budget/sidebar/SidebarTree.tsx`:

```tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { MonthLink } from "@/components/budget/sidebar/MonthLink"
import { CreateMonthButton } from "@/components/budget/sidebar/CreateMonthButton"
import { parseYm } from "@/lib/utils/ym"

export type YearGroup = {
  year: number
  months: string[] // ym 배열, 내림차순
}

const SETTINGS_LINKS = [
  { href: "/budget/settings/categories", label: "카테고리" },
  { href: "/budget/settings/payment-methods", label: "결제수단" },
  { href: "/budget/settings/fixed-expenses", label: "고정지출" },
] as const

export function SidebarTree({
  yearGroups,
  currentYm,
  createTarget,
}: {
  yearGroups: YearGroup[]
  currentYm: string
  createTarget: string | null
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>(
    () => {
      const init: Record<number, boolean> = {}
      if (yearGroups.length > 0) init[yearGroups[0].year] = true
      return init
    }
  )
  const pathname = usePathname()

  const toggleYear = (year: number) => {
    setExpandedYears((prev) => ({ ...prev, [year]: !prev[year] }))
  }

  return (
    <>
      {/* 모바일 햄버거 (md 이상에선 숨김) */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-3 z-40 md:hidden"
        aria-label="사이드바 열기"
      >
        ☰
      </button>

      {/* 모바일 dim overlay */}
      {mobileOpen ? (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      ) : null}

      {/* 사이드바 본체 */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-56 border-r border-neutral-200 bg-white px-3 py-4 transition-transform md:sticky md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col overflow-y-auto">
          {/* 일지 트리 */}
          <div className="mb-6">
            <h2 className="mb-2 px-2 text-xs font-semibold text-neutral-500">
              📒 일지
            </h2>
            {yearGroups.length === 0 ? (
              <p className="px-2 text-xs text-neutral-400">아직 월 없음</p>
            ) : (
              <ul className="space-y-1">
                {yearGroups.map((group) => (
                  <li key={group.year}>
                    <button
                      type="button"
                      onClick={() => toggleYear(group.year)}
                      className="flex w-full items-center gap-1 rounded px-2 py-1 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                    >
                      <span className="text-neutral-400">
                        {expandedYears[group.year] ? "▼" : "▶"}
                      </span>
                      {group.year}년
                    </button>
                    {expandedYears[group.year] ? (
                      <ul className="ml-4 mt-1 space-y-0.5">
                        {group.months.map((ym) => (
                          <li key={ym}>
                            <MonthLink ym={ym} isCurrent={ym === currentYm} />
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* + 생성 버튼 */}
          {createTarget ? (
            <div className="mb-6 px-2">
              <CreateMonthButton
                ym={createTarget}
                label={`+ ${parseYm(createTarget).month}월 생성`}
                variant="sidebar"
              />
            </div>
          ) : null}

          {/* 설정 메뉴 */}
          <div className="mt-auto">
            <h2 className="mb-2 px-2 text-xs font-semibold text-neutral-500">
              ⚙️ 설정
            </h2>
            <ul className="space-y-0.5">
              {SETTINGS_LINKS.map((link) => {
                const isActive = pathname.startsWith(link.href)
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "block rounded px-2 py-1 text-sm transition-colors",
                        isActive
                          ? "bg-neutral-100 font-bold text-neutral-900"
                          : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                      )}
                    >
                      ㆍ {link.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </aside>
    </>
  )
}
```

- [ ] **Step 2: 빌드 검증**

Run:
```bash
cd /Users/seungsoosmacbook/Desktop/seungsoo-life
pnpm exec tsc --noEmit 2>&1 | tail -3 ; echo "TSC EXIT: $?"
pnpm build 2>&1 | tail -5
```

Expected: 통과.

**중요: 빌드 실패한 상태로 커밋 금지.**

- [ ] **Step 3: 커밋**

```bash
git add components/budget/sidebar/SidebarTree.tsx
git commit -m "feat(budget-sidebar): SidebarTree (햄버거 + year 토글 + 설정 메뉴)"
```

---

## Task 8: `Sidebar.tsx` (server) + `app/budget/layout.tsx`

**Files:**
- Create: `components/budget/sidebar/Sidebar.tsx`
- Create: `app/budget/layout.tsx`

**Working directory:** `/Users/seungsoosmacbook/Desktop/seungsoo-life/`

- [ ] **Step 1: Sidebar.tsx (server) 작성**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/components/budget/sidebar/Sidebar.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server"
import { getCurrentYm, getNextYm, parseYm } from "@/lib/utils/ym"
import {
  SidebarTree,
  type YearGroup,
} from "@/components/budget/sidebar/SidebarTree"

export async function Sidebar() {
  const supabase = await createClient()

  const [
    { data: summaries, error: sumErr },
    { data: txYms, error: txErr },
  ] = await Promise.all([
    supabase
      .from("monthly_summaries")
      .select("year_month")
      .order("year_month", { ascending: false }),
    supabase
      .from("transactions")
      .select("year_month")
      .order("year_month", { ascending: false }),
  ])

  if (sumErr || txErr) {
    return (
      <aside className="fixed left-0 top-0 z-50 h-screen w-56 border-r border-neutral-200 bg-white px-3 py-4 md:sticky">
        <p className="text-sm text-red-600">
          사이드바 로드 실패: {sumErr?.message ?? txErr?.message}
        </p>
      </aside>
    )
  }

  // 두 집합 합집합 → 중복 제거 → 내림차순 정렬
  const ymSet = new Set<string>()
  for (const r of summaries ?? []) ymSet.add(r.year_month)
  for (const r of txYms ?? []) ymSet.add(r.year_month)
  const sortedYms = [...ymSet].sort().reverse() // 내림차순

  // year별 그룹화 (year 내림차순, month 내림차순)
  const groupsMap = new Map<number, string[]>()
  for (const ym of sortedYms) {
    const { year } = parseYm(ym)
    const arr = groupsMap.get(year) ?? []
    arr.push(ym)
    groupsMap.set(year, arr)
  }
  const yearGroups: YearGroup[] = [...groupsMap.entries()]
    .sort((a, b) => b[0] - a[0]) // year 내림차순
    .map(([year, months]) => ({ year, months }))

  // createTarget 계산
  const currentYm = getCurrentYm()
  const latestYm = sortedYms[0] ?? null
  let createTarget: string | null = null
  if (!latestYm) {
    // 첫 사용자 — 아무 월도 없음
    createTarget = currentYm
  } else {
    const nextAfterLatest = getNextYm(latestYm)
    createTarget = ymSet.has(nextAfterLatest) ? null : nextAfterLatest
  }

  return (
    <SidebarTree
      yearGroups={yearGroups}
      currentYm={currentYm}
      createTarget={createTarget}
    />
  )
}
```

- [ ] **Step 2: app/budget/layout.tsx 작성**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/app/budget/layout.tsx`:

```tsx
import { Sidebar } from "@/components/budget/sidebar/Sidebar"

export default function BudgetLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex">
      <Sidebar />
      <main className="min-h-screen flex-1 md:ml-0">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: 빌드 검증**

Run:
```bash
cd /Users/seungsoosmacbook/Desktop/seungsoo-life
pnpm exec tsc --noEmit 2>&1 | tail -3 ; echo "TSC EXIT: $?"
pnpm build 2>&1 | tail -10
```

Expected: 빌드 성공. 라우트 목록에 `/budget`, `/budget/[ym]`, `/budget/settings/*` 모두 표시.

**중요: 빌드 실패한 상태로 커밋 금지.**

- [ ] **Step 4: 커밋**

```bash
git add components/budget/sidebar/Sidebar.tsx app/budget/layout.tsx
git commit -m "feat(budget-sidebar): Sidebar (server data fetch) + layout 마운트 [ADR-012]"
```

ADR-012 태그 — `app/budget/layout.tsx`에 사이드바 마운트 → 설정 페이지에도 노출 (PRD §7.2 사이드바 트리에 ⚙️ 설정 포함이라).

---

## Task 9: USER MANUAL — Gate A + B + C 검증

**Files:** (없음 — 브라우저 수동)

- [ ] **Step 1: dev 서버 띄우기 (백그라운드)**

Run:
```bash
cd /Users/seungsoosmacbook/Desktop/seungsoo-life
pnpm dev > /tmp/dev.log 2>&1 &
echo "dev PID: $!"
sleep 6
curl -s -o /dev/null -w "ready: %{http_code}\n" http://localhost:3000/signin
```

Expected: ready 200.

- [ ] **Step 2: 사용자에게 안내문 출력 (USER PAUSE)**

다음을 사용자에게 그대로 출력:

```
🔴 USER PAUSE — Gate A (라우팅) + Gate B (사이드바) + Gate C (+ 생성)

이미 로그인 상태면 곧장. 아니면 /signin → Google 로그인 먼저.

【Gate A — 라우팅 + redirect】
1. http://localhost:3000/budget 접근
   → 자동으로 /budget/<오늘의 YYYY-MM> 로 이동 (예: /budget/2026-05)
   → 페이지: 첫 사용 시 "이 월은 아직 생성되지 않았습니다" + "이 월 생성" 버튼 (NoMonthYet)
   또는 (이미 생성됐으면) "2026년 5월" 헤더 + "거래 입력은 다음 Phase에서..." (MonthHeader)
2. http://localhost:3000/budget/2026-13 입력 → 404 Not Found
3. http://localhost:3000/budget/2099-12 입력 → NoMonthYet 화면

【Gate B — 사이드바 표시】
4. /budget/2026-05 좌측에 사이드바 표시:
   - 📒 일지 + year 트리 (생성된 월이 있으면)
   - 사이드바 하단에 "+ N월 생성" 버튼 (다음 월 없으면)
   - 가장 아래 ⚙️ 설정 + 카테고리/결제수단/고정지출
5. 사이드바에서 "카테고리" 클릭 → /budget/settings/categories 이동
   → 사이드바 여전히 표시됨 (설정 페이지에도 사이드바 노출)
   → 페이지 컨텐츠는 기존 설정 sub-nav + 카테고리 트리
6. (모바일) 브라우저 창을 768px 미만으로 좁힘 → 사이드바 사라지고 좌상단 ☰ 표시
   → ☰ 클릭 → 사이드바 슬라이드 → 항목 클릭하면 사이드바 자동 닫힘

【Gate C — "+ 생성" 버튼】
7. 첫 사용자 케이스: /budget/<currentYm> NoMonthYet에서 "이 월 생성" 클릭
   → 페이지 새로고침 → MonthHeader 표시 + 사이드바 트리에 ⭐ 5월 등장
8. 사이드바 하단 "+ 6월 생성" 클릭 (latestYm 다음 월)
   → /budget/2026-06 자동 이동
   → 사이드바 트리에 6월 추가됨
   → 하단 버튼이 "+ 7월 생성"으로 변함
9. 같은 월 생성 한 번 더 시도 (URL 직접 /budget/2026-06 + NoMonthYet은 안 보임)
   → 그냥 MonthHeader 표시 (idempotent, 에러 없음)

세 게이트 다 통과하면 채팅에 "Gate A + B + C 통과"라고 알려줘.
어느 단계에서 막히면 어떤 step / 무슨 에러인지.
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

## Task 10: Gate D (MCP cascade 검증) + Final Gate E + ADR 알림

**Files:** (없음 — MCP + 확인만)

**Supabase project_id:** `iwrcprtjyxzfsriiupsw`

- [ ] **Step 1: Gate D — opening_balance cascade**

Gate D는 Phase 3 트리거가 잘 작동하는지 4b-1 환경에서 재검증. transactions UI는 아직 없으니 MCP로 직접 INSERT/DELETE.

먼저 사용자 user_id 확인:
```
mcp__claude_ai_Supabase__execute_sql
project_id: "iwrcprtjyxzfsriiupsw"
query: "select id, email from auth.users order by created_at desc limit 1;"
```

응답에서 user id 확인 (이하 `<UID>`로 치환).

현재 monthly_summaries 상태 확인:
```
mcp__claude_ai_Supabase__execute_sql
project_id: "iwrcprtjyxzfsriiupsw"
query: "select year_month, opening_balance, current_balance from public.monthly_summaries where user_id='<UID>' order by year_month;"
```

기대: Gate C에서 생성한 월들이 표시됨 (예: 2026-05, 2026-06). 각 행에 opening/current.

테스트 거래 INSERT (latestYm 직전의 month — 예 2026-05에 거래):
```
mcp__claude_ai_Supabase__execute_sql
project_id: "iwrcprtjyxzfsriiupsw"
query: |
  insert into public.transactions
    (user_id, year_month, date, type, category_1st, amount, is_paid)
  values
    ('<UID>', '2026-05', '2026-05-15', 'income', '월급', 1000, true);

  select year_month, opening_balance, current_balance
    from public.monthly_summaries
   where user_id='<UID>'
   order by year_month;
```

기대 (가정: 5월/6월 둘 다 생성됨):
- 2026-05: opening=0, current=1000 (입금 1000)
- 2026-06: opening=1000 (5월 current 이월), current=1000 ← **cascade 작동 확인**

만약 6월 opening이 자동으로 1000으로 안 바뀌면 Phase 3 트리거 문제 — STOP.

cleanup:
```
mcp__claude_ai_Supabase__execute_sql
project_id: "iwrcprtjyxzfsriiupsw"
query: |
  delete from public.transactions where user_id='<UID>' and category_1st='월급' and amount=1000;
  select year_month, opening_balance, current_balance
    from public.monthly_summaries
   where user_id='<UID>'
   order by year_month;
```

기대: 5월 current=0, 6월 opening=0 (cascade로 원상복귀).

- [ ] **Step 2: Gate E — 빌드/린트/타입체크**

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

- [ ] **Step 3: git 상태 확인**

Run:
```bash
cd /Users/seungsoosmacbook/Desktop/seungsoo-life
git status --short
git log --oneline -12
git ls-files | grep "\.env\.local$" ; echo "(empty = OK)"
```

Expected:
- `git status`: 빈 출력 (working tree clean)
- `git log`: Phase 4b-1 신규 커밋 8개 (Task 1-8) + 이전 커밋들
- `.env.local` 추적 안 됨

- [ ] **Step 4: ADR 알림 출력**

사용자에게 다음 메시지 출력:

```
🎉 Phase 4b-1 완료.

✅ Gate A: 라우팅 + redirect (/budget → /budget/<currentYm>)
✅ Gate B: 사이드바 (월 트리 + 설정 메뉴 + 모바일 햄버거 + 설정 페이지에도 표시)
✅ Gate C: + 생성 버튼 (sidebar variant + NoMonthYet primary variant + idempotent)
✅ Gate D: opening_balance cascade (Phase 3 트리거 4b-1 환경에서 재검증)
✅ Gate E: pnpm build / lint / tsc 통과, git clean

⚠️ Notion 업데이트 필요 — ADR 2건 (가계부 모듈 페이지 §14 누적)

ADR-011: "다음 월 생성" 버튼 위치를 사이드바 하단으로 변경
- 일자: 2026-05-30
- 결정: PRD §7.4 "다음 월 생성 버튼 우측 상단" → "사이드바 하단" 변경
- 이유: 사이드바 월 트리 마지막에 자연스럽게 이어짐. 의미적으로 "이 트리의 다음 항목 추가"로 직관적
- 영향: components/budget/sidebar/CreateMonthButton.tsx (사이드바 하단 마운트). 우측 상단엔 안 둠

ADR-012: app/budget/layout.tsx에 사이드바 마운트 → 설정 페이지에도 사이드바 노출
- 일자: 2026-05-30
- 결정: 사이드바를 모든 /budget/* 페이지의 공통 layout에 마운트
- 이유: PRD §7.2 사이드바 트리에 ⚙️ 설정 항목 포함되어 있음. 모든 /budget/* 공통 layout이 일관성 측면에서 자연스러움. Phase 4a 설정 페이지가 이제 사이드바 받음 (변경 사항)
- 영향: app/budget/layout.tsx (신규). 기존 settings/layout.tsx의 sub-nav는 그대로 유지 (사이드바 ⚙️ 설정 → 설정 첫 화면 → sub-nav로 다른 설정 탭 이동)
```

**커밋 없음** (확인 단계)

---

## Final Verification Summary

모든 Task 완료 후 다음 상태가 보장됨:

- [ ] `lib/utils/ym.ts` 작성 (6 헬퍼)
- [ ] `lib/actions/budget-months.ts` 작성 (createNextMonth, idempotent)
- [ ] `app/budget/page.tsx` redirect (메인 자동 이동)
- [ ] `components/budget/sidebar/CreateMonthButton.tsx` 작성
- [ ] `app/budget/[ym]/page.tsx` + MonthHeader + NoMonthYet
- [ ] `components/budget/sidebar/MonthLink.tsx` 작성
- [ ] `components/budget/sidebar/SidebarTree.tsx` 작성
- [ ] `components/budget/sidebar/Sidebar.tsx` + `app/budget/layout.tsx`
- [ ] 5개 검증 게이트 (A-E) 통과
- [ ] git working tree clean
- [ ] ADR-011/012 사용자에게 보고

---

## 트러블슈팅

**`/budget/2026-05` 접근 시 사이드바가 layout보다 늦게 나타남:**
- `app/budget/layout.tsx`가 `app/layout.tsx`와 중첩 (Next 14 App Router 표준). 글로벌 헤더는 root layout, 사이드바는 budget layout. 둘 다 server component라 SSR로 한 번에 렌더링됨. 만약 시각적으로 늦으면 hydration 이슈 — 컨테이너 div className `flex` 확인.

**사이드바 데스크탑에선 sticky인데 컨텐츠가 사이드바 아래로 들어감:**
- `app/budget/layout.tsx`의 `<div className="flex">` 확인. flex layout이라 main이 사이드바 옆에 와야 함.
- 만약 main이 사이드바 width만큼 밀려나는 게 아니라 겹치면, Sidebar의 `fixed` 클래스를 데스크탑에서 `md:sticky`로 바꾸는 게 잘 적용됐는지 확인.

**모바일에서 햄버거 클릭 후 사이드바 안 닫힘:**
- MonthLink/SETTINGS_LINKS 클릭 시 onClick으로 `setMobileOpen(false)` 호출. MonthLink는 Link 컴포넌트라 props로 받지 않으면 닫히지 않을 수 있음 — 일단 4b-1에선 SETTINGS_LINKS만 명시 처리, MonthLink는 라우트 이동 자체로 충분.

**`createNextMonth` 호출 후 사이드바 트리에 새 월 안 나옴:**
- `revalidatePath('/budget', 'layout')` 호출 확인. `'page'` 아닌 `'layout'`이어야 사이드바 (layout level) 재fetch.
- 클라이언트 라우터 캐시 문제일 수도 — `router.refresh()` 추가 검토 (4b-1에선 router.push만으로 충분 예상).

**`yearGroups[0].year`로 latest year 접근 시 빈 배열 에러:**
- `yearGroups.length > 0` 가드 필수. 첫 사용자는 yearGroups 비어있음.

**SidebarTree에서 `parseYm(createTarget!)` 같이 ! 사용 자제:**
- `createTarget`이 null이면 CreateMonthButton 렌더 자체를 안 하니까 안에서 parseYm 호출 안 됨. 조건부 렌더 안에서 호출이라 안전.

**`/budget` 라우트가 (Static)으로 빌드되어 redirect가 build time에 evaluate되는 것 같으면:**
- `getCurrentYm()`이 build time에 한 번만 실행됨 → 잘못된 동작. `app/budget/page.tsx`를 force-dynamic으로 만들거나, `redirect`를 server component runtime에서 호출하도록 export const dynamic = 'force-dynamic' 추가.
- Next 14에서 `redirect()` 사용 페이지는 자동으로 dynamic (Static 안 됨). 빌드 출력에 (Dynamic) 또는 (ƒ)로 표시되는지 확인. (Static)이면 위 force-dynamic 추가.

---

## 의도적으로 안 함 (이 plan의 범위 밖)

- 거래 입력 (인라인 테이블) — Phase 4b-2
- 입금/출금 두 그룹 레이아웃 — Phase 4b-2
- 정렬 규칙 (고정/비고정, 1차/2차/날짜) — Phase 4b-2
- "다음 월 생성" 시 고정지출 자동 INSERT — Phase 4b-2
- 월별 요약 7개 지표 표시 — Phase 4b-2
- 대시보드 차트 — Phase 4c
- 엑셀 import — Phase 5+
- 월 사이 이전/다음 버튼 (← →) — 사이드바로 충분
- year 접힘 상태 localStorage persist — 단순화
- breadcrumb — 사이드바 트리가 역할
- 월 삭제/복제 — 의도적으로 막음
