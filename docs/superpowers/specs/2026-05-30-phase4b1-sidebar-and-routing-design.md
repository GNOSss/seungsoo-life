# Phase 4b-1 — 사이드바 + 월별 라우팅 설계 (Design Spec)

> 일자: 2026-05-30
> 프로젝트: 승수 라이프 (통합 PWA) — 가계부 모듈
> 단계: Phase 4b-1 (사이드바 + 월별 라우팅 + 빈 월별 페이지 + 다음 월 생성)
> 관련 PRD:
> - 마스터플랜: https://www.notion.so/35acf376124680498e8ecca4a28566f3
> - 가계부 모듈 PRD: https://www.notion.so/36dcf376124681d1aed1cc5f7212ab2f
> Phase 4 분할: 4a (완료) → 4b-1 (이 문서) → 4b-2 (거래 입력 + 정렬 + 요약 + 고정지출 자동) → 4c (대시보드 차트)

---

## 1. 목적과 범위

Phase 4b-1의 단일 목표: **월별 페이지를 사이드바 트리로 네비게이션 가능한 상태를 만든다.**

완료 시점: `/budget/[ym]/` 라우팅 + 좌측 사이드바 (월별 일지 트리 + 설정 메뉴) + 메인 자동 이동 (현재 년월) + "다음 월 생성" 버튼 (monthly_summaries row만 생성, opening_balance 직전월 이월). **거래 입력/정렬/요약 표시는 Phase 4b-2.**

**브레인스토밍 결과 확정 사항** (2026-05-30):
- Phase 4b 분할: 4b-1 (이 문서) / 4b-2 (거래 + 정렬 + 요약 + 고정지출 자동)
- 사이드바 적용 범위: **모든 `/budget/*` 페이지** (설정 페이지에도 사이드바)
- URL 패턴: `/budget/[ym]/` (예: `/budget/2026-05/`)
- "+ 생성" 버튼 위치: **사이드바 하단** (PRD §7.4는 "우측 상단" — 변경, ADR-011)

**범위 안**: 라우팅, 사이드바, 메인 자동 이동, monthly_summaries row 생성.

**범위 밖** (4b-2/4c/5+): 거래 입력, 정렬 규칙, 7개 지표 표시, 고정지출 자동 INSERT, 차트, 엑셀 import.

## 2. 기술 스택 (4b-1에서 추가/사용)

| 항목 | 사용 |
|---|---|
| 라우팅 | Next.js 14 App Router dynamic segment `/budget/[ym]/` |
| 사이드바 | Server Component (데이터 fetch) + Client Component (햄버거 토글, active 표시) |
| `createNextMonth` | Server Action with Zod validation (Phase 4a 패턴) |
| ym 유틸 | 순수 함수 (server/client 양쪽 OK, KST timezone 강제) |
| 모바일 햄버거 | `useState` + body 클래스 토글 (별도 lib 없이 Tailwind 클래스로) |

**신규 의존성 없음** (Phase 4a까지의 zod + shadcn + sonner 활용).

## 3. 폴더 구조 (Phase 4b-1 종료 시)

```
seungsoo-life/
├── app/
│   ├── budget/
│   │   ├── layout.tsx                                  ← 신규 (Sidebar 마운트, 모든 /budget/* 공통)
│   │   ├── page.tsx                                    ← 수정 (placeholder → getCurrentYm() redirect)
│   │   ├── [ym]/                                       ← 신규 디렉토리
│   │   │   └── page.tsx                                ← 신규 (월별 빈 페이지 + NoMonthYet 분기)
│   │   └── settings/                                   ← Phase 4a (변경 없음, 사이드바를 새로 받음)
│   │       ├── layout.tsx
│   │       ├── categories/
│   │       ├── payment-methods/
│   │       └── fixed-expenses/
├── components/
│   ├── budget/
│   │   ├── sidebar/                                    ← 신규 디렉토리
│   │   │   ├── Sidebar.tsx                             ← 신규 (server, 데이터 fetch)
│   │   │   ├── SidebarTree.tsx                         ← 신규 (client, 햄버거 토글, active)
│   │   │   ├── MonthLink.tsx                           ← 신규 (client, ⭐ + 굵게)
│   │   │   └── CreateMonthButton.tsx                   ← 신규 (client, server action 호출)
│   │   └── settings/                                   ← Phase 4a (변경 없음)
├── lib/
│   ├── actions/
│   │   ├── budget-months.ts                            ← 신규 (createNextMonth server action)
│   │   ├── auth.ts                                     ← Phase 4a
│   │   ├── categories.ts                               ← Phase 4a
│   │   ├── payment-methods.ts                          ← Phase 4a
│   │   └── fixed-expenses.ts                           ← Phase 4a
│   └── utils/                                          ← 신규 디렉토리
│       └── ym.ts                                       ← 신규 (6개 헬퍼)
```

총 신규 파일 9개 (4 sidebar + 1 layout + 1 dynamic page + 1 action + 1 util + 1 directory `[ym]`), 수정 1개 (`app/budget/page.tsx`).

## 4. 라우팅 명세

### 4.1 URL 패턴

| URL | 결과 |
|---|---|
| `/budget` | server-side redirect to `/budget/<currentYm>` (예: `/budget/2026-05`) |
| `/budget/2026-05` | 5월 페이지 (빈 컨텐츠 + 사이드바) |
| `/budget/2026-13` | invalid ym → `notFound()` (404) |
| `/budget/2099-12` | valid ym이지만 monthly_summaries row 없음 → `NoMonthYet` 화면 |
| `/budget/settings/categories` | 설정 페이지 + 사이드바 (Phase 4a + 사이드바 추가) |

### 4.2 메인 자동 이동 동작

```ts
// app/budget/page.tsx
import { redirect } from 'next/navigation'
import { getCurrentYm } from '@/lib/utils/ym'

export default function BudgetPage() {
  redirect(`/budget/${getCurrentYm()}`)
}
```

- Server-side redirect (SSR, 클라이언트 JS 없음)
- `getCurrentYm()`은 KST 기준 (Vercel UTC 환경 안전)

### 4.3 Dynamic segment 검증

```ts
// app/budget/[ym]/page.tsx
import { notFound } from 'next/navigation'
import { isValidYm } from '@/lib/utils/ym'

export default async function MonthPage({ params }: { params: { ym: string } }) {
  if (!isValidYm(params.ym)) notFound()
  
  // ... server fetch + 분기
}
```

- 형식 검증: `^\d{4}-(0[1-9]|1[0-2])$`
- 검증 실패 → Next.js의 `notFound()` → 기본 404 페이지

## 5. 사이드바 명세

### 5.1 데스크탑 레이아웃

```
┌─────────────────┬──────────────────────────────────────────────┐
│ 글로벌 헤더 (가계부/일기장/운동기록 + UserMenu)              │
├─────────────────┬──────────────────────────────────────────────┤
│                 │                                              │
│ 📒 일지         │   {월별 페이지 or 설정 컨텐츠}              │
│ ▼ 2026년       │                                              │
│   ⭐ 5월        │                                              │
│   ㆍ 4월         │                                              │
│   ㆍ 3월         │                                              │
│ ▼ 2025년       │                                              │
│   ㆍ 12월        │                                              │
│   ㆍ 11월        │                                              │
│   ...           │                                              │
│                 │                                              │
│ [+ 6월 생성]    │                                              │
│                 │                                              │
│ ⚙️ 설정         │                                              │
│   ㆍ 카테고리    │                                              │
│   ㆍ 결제수단    │                                              │
│   ㆍ 고정지출    │                                              │
│                 │                                              │
└─────────────────┴──────────────────────────────────────────────┘
   (w-56 = 224px)
```

### 5.2 모바일 레이아웃 (< 768px)

```
┌─────────────────────────────────────┐
│ ☰  글로벌 헤더  UserMenu             │  ← 햄버거 추가
├─────────────────────────────────────┤
│ {컨텐츠}                            │
└─────────────────────────────────────┘

☰ 클릭 시:
┌─────────────────┬───────────────────┐
│ [사이드바 슬라이드] │ {컨텐츠 dim overlay}│
└─────────────────┴───────────────────┘
```

- 사이드바는 fixed left + transition-transform
- 모바일 햄버거는 `<768px`에서만 표시 (Tailwind `md:hidden`)
- 데스크탑 (≥ 768px)에선 사이드바 항상 visible

### 5.3 컴포넌트 책임

**`Sidebar.tsx` (server component)**
- 데이터 fetch:
  - `monthly_summaries`에서 본인 모든 row의 `year_month` SELECT
  - `transactions`에서 distinct `year_month` SELECT (안전망 — summaries 없는데 거래만 있는 월 처리)
  - 두 집합 합집합
- year별로 그룹화 (year 내림차순, 각 year 내에서 month 내림차순)
- `currentYm = getCurrentYm()`, `latestYm = max(year_month)` 계산
- `latestYm`의 다음 월(`nextYm`)이 집합에 없으면 → 그게 "+ 생성" 대상 ym
- `latestYm`도 없으면 (첫 사용자) → `currentYm`이 "+ 생성" 대상
- props로 `<SidebarTree yearGroups={...} currentYm={...} createTarget={...} />`

**`SidebarTree.tsx` (client component)**
- props: `{ yearGroups: { year: number; months: string[] }[], currentYm: string, createTarget: string | null }`
- 모바일 햄버거 토글 (`useState<boolean>`)
- year 펼침/접힘 (`useState<Record<number, boolean>>`, 기본은 가장 최근 year만 펼침)
- 활성 월 표시 (`usePathname()` 사용)
- 하단에 `<CreateMonthButton ym={createTarget} />` (createTarget이 null이면 표시 X)
- 하단에 ⚙️ 설정 + 3 sub 메뉴 (`/budget/settings/{categories,payment-methods,fixed-expenses}`) 정적 링크

**`MonthLink.tsx` (client component)**
- props: `{ ym: string; isCurrent: boolean }`
  - `isCurrent`는 "실제 오늘이 속한 월" (Sidebar에서 currentYm prop으로 판단)
- `usePathname()`로 isActive 자체 계산 (URL이 `/budget/{ym}`이면 isActive)
- 표시:
  - `isCurrent` true → ⭐ 접두사
  - `isActive` true → 굵게 + 배경 강조
  - 둘 다 false → 일반 텍스트 `ㆍ N월` 형식
- Link to `/budget/{ym}/`

**`CreateMonthButton.tsx` (client component)**
- props: `{ ym: string; label: string; variant?: 'sidebar' | 'primary' }`
- variant='sidebar' (기본): 사이드바 하단 작은 버튼 "+ {month} 생성"
- variant='primary' (NoMonthYet에서 사용): 중앙 큰 primary 버튼 "이 월 생성"
- 클릭 시 `useTransition` + `createNextMonth({ ym })` 호출
- 성공 시 `router.push('/budget/{ym}/')` (sidebar는 navigation, NoMonthYet도 동일)
- 실패 시 toast.error

### 5.4 사이드바 활성 표시 규칙

| 상태 | 표시 |
|---|---|
| 현재 보고 있는 ym (URL 매칭) | 굵게 + 배경 강조 |
| 실제 오늘 속한 ym | ⭐ 접두사 |
| 둘 다 (오늘 월 페이지를 보고 있음) | ⭐ + 굵게 + 배경 |
| 어느 것도 아님 | `ㆍ N월` 형식 일반 |

### 5.5 사이드바 데이터 새로고침

- 새 월 생성 후: `revalidatePath('/budget', 'layout')` → 사이드바 (layout) 자동 재fetch → 새 월이 트리에 등장
- 새 거래 추가 (4b-2): `revalidatePath('/budget/[ym]', 'page')` → 해당 페이지만 갱신, 사이드바는 그대로 (월 자체는 안 변하니까)

## 6. 월별 페이지 명세 (4b-1: 빈 페이지)

### 6.1 `app/budget/[ym]/page.tsx`

**책임**: ym 검증 + `monthly_summaries` row 존재 확인 → 분기 (MonthHeader / NoMonthYet)

**서버 컴포넌트 코드 구조**:
```ts
export default async function MonthPage({ params }: { params: { ym: string } }) {
  if (!isValidYm(params.ym)) notFound()
  
  const supabase = await createClient()
  const { data: summary } = await supabase
    .from('monthly_summaries')
    .select('year_month, opening_balance, current_balance')
    .eq('year_month', params.ym)
    .maybeSingle()
  
  if (!summary) return <NoMonthYet ym={params.ym} />
  
  return <MonthHeader ym={params.ym} />
  // 4b-2에서 이 줄에 TransactionTable + MonthlySummary 추가
}
```

### 6.2 `MonthHeader` 컴포넌트 (4b-1: 단순)

```tsx
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
```

### 6.3 `NoMonthYet` 컴포넌트

```tsx
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

**언제 표시되는가**:
- 첫 사용자가 `/budget` → `/budget/<currentYm>` 자동 이동했지만 monthly_summaries 비어있음
- 사용자가 URL 직접 입력 (예: `/budget/2099-12`)

## 7. `lib/utils/ym.ts` 명세

```ts
/** YYYY-MM 형식 검증 */
export function isValidYm(ym: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(ym)
}

/** 현재 년월 (KST 기준, 서버/클라이언트 모두 동일) */
export function getCurrentYm(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
  })
  // en-CA locale은 ISO-like 형식 출력 → "2026-05" 형태로 떨어짐
  return formatter.format(new Date())
}

/** 다음 월 */
export function getNextYm(ym: string): string {
  const { year, month } = parseYm(ym)
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
  return `${next.year}-${String(next.month).padStart(2, '0')}`
}

/** 직전 월 */
export function getPrevYm(ym: string): string {
  const { year, month } = parseYm(ym)
  const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
  return `${prev.year}-${String(prev.month).padStart(2, '0')}`
}

/** YYYY-MM → { year, month } */
export function parseYm(ym: string): { year: number; month: number } {
  const [y, m] = ym.split('-')
  return { year: Number(y), month: Number(m) }
}

/** "2026-05" → "2026년 5월" */
export function formatYmKorean(ym: string): string {
  const { year, month } = parseYm(ym)
  return `${year}년 ${month}월`
}
```

**핵심 결정**:
- 모두 순수 함수 (no side effects, no I/O)
- `getCurrentYm()`만 `new Date()` 사용 (current time)
- KST timezone 강제 (Vercel UTC 환경 + 자정 근처 사용자 KST 시간 혼란 방지)
- `parseYm` 입력은 `isValidYm` 통과한 ym 가정 (방어 코드 X — 호출자가 검증)

## 8. `lib/actions/budget-months.ts` 명세

### 8.1 `createNextMonth` 시그니처

```ts
export async function createNextMonth(input: { ym: string }): Promise<Result>
```

### 8.2 동작

1. Zod 검증 (`ym`이 `YYYY-MM` 형식)
2. `getAuthedClient()` (Phase 4a 패턴 — `AuthedClient` discriminated union)
3. **idempotent 체크**: 이미 그 ym의 `monthly_summaries` row가 있는지 확인 → 있으면 `revalidatePath` + `{ ok: true }` 조기 반환
4. **직전 월 잔고**:
   - `prevYm = getPrevYm(input.ym)`
   - `monthly_summaries`에서 `prevYm` row의 `current_balance` SELECT
   - 없으면 0
5. **INSERT**:
   - `user_id, year_month, opening_balance, current_balance, expected_balance` 명시 (모두 직전월 current_balance 값)
   - 나머지 (income_total, expense_total, paid_total, unpaid_total)는 DB default 0
6. `revalidatePath('/budget', 'layout')` (사이드바 갱신)
7. `{ ok: true }`

### 8.3 코드

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
  const { data: { user } } = await supabase.auth.getUser()
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

  // 직전 월 잔고
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
  })

  if (error) return { ok: false, error: error.message }
  revalidatePath("/budget", "layout")
  return { ok: true }
}
```

## 9. 검증 게이트 (Phase 4b-1 완료 조건)

### 9.1 게이트 A — 라우팅 + redirect

- `/budget` → 자동 `/budget/<currentYm>` redirect
- `/budget/2026-13` → 404
- 존재하지 않는 ym (예: `/budget/2099-12`) → `NoMonthYet` 화면

### 9.2 게이트 B — 사이드바

- `/budget/2026-05/` 시 좌측 사이드바 표시
- 트리: 본인 monthly_summaries의 year_month 그룹화 표시
- 현재 페이지 월 → 굵게 + 배경 강조
- 실제 오늘 월 → ⭐ 접두사
- 데스크탑 항상 visible / 모바일 햄버거 토글
- 설정 페이지(`/budget/settings/categories`)에서도 사이드바 동일 표시

### 9.3 게이트 C — "다음 월 생성" 버튼

- 첫 사용자: `NoMonthYet` "이 월 생성" → DB row 생성 → 새로고침 시 빈 페이지 + 사이드바 트리에 ⭐ 현재월
- 사이드바 하단 "+ N월 생성": 클릭 → 생성 + `/budget/<ym>` 자동 이동
- 다음 월 생성 후 그 다음 월 버튼 자동 표시 (latestYm 갱신)
- 같은 ym 두 번 생성 → idempotent (에러 없음)

### 9.4 게이트 D — opening_balance cascade

- 5월 생성 (opening=0, current=0) → 6월 생성 (opening=0, 5월 current 이월)
- MCP execute_sql로 5월 transactions 1개 INSERT → 5월 current 변경 → 6월 opening 자동 갱신 (Phase 3 트리거 작동 확인)
- 검증 후 cleanup (테스트 transaction 삭제)

### 9.5 게이트 E — 빌드/린트/타입체크

- `pnpm build` 통과
- `pnpm exec tsc --noEmit` 통과
- `pnpm lint` 통과
- git working tree clean

다섯 게이트 모두 통과 → Phase 4b-1 완료 → 4b-2 진입.

## 10. ADR 알림 (Phase 4b-1 종료 시 사용자에게 보고)

```
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

## 11. Phase 4b-1 완료 정의 (DoD)

- [ ] `lib/utils/ym.ts` 작성 (6개 헬퍼: isValidYm, getCurrentYm, getNextYm, getPrevYm, parseYm, formatYmKorean)
- [ ] `lib/actions/budget-months.ts` 작성 (createNextMonth, idempotent)
- [ ] `app/budget/layout.tsx` 신규 (Sidebar 마운트)
- [ ] `app/budget/page.tsx` 수정 (placeholder → getCurrentYm redirect)
- [ ] `app/budget/[ym]/page.tsx` 신규 (월별 빈 페이지 + NoMonthYet 분기)
- [ ] `components/budget/sidebar/Sidebar.tsx` (server, fetch + 트리 구조)
- [ ] `components/budget/sidebar/SidebarTree.tsx` (client, 햄버거 토글 + active)
- [ ] `components/budget/sidebar/MonthLink.tsx` (client, ⭐ + 굵게)
- [ ] `components/budget/sidebar/CreateMonthButton.tsx` (client, server action 호출)
- [ ] 5개 검증 게이트 (A-E) 통과
- [ ] git working tree clean
- [ ] ADR-011/012 사용자에게 보고

## 12. 의도적으로 안 하는 것 (YAGNI / 후속 Phase)

- ❌ 거래 입력 (인라인 테이블) — Phase 4b-2
- ❌ 입금/출금 두 그룹 레이아웃 — Phase 4b-2
- ❌ 정렬 규칙 (고정/비고정, 1차/2차/날짜) — Phase 4b-2
- ❌ "다음 월 생성" 시 고정지출 자동 INSERT — Phase 4b-2
- ❌ 월별 요약 7개 지표 표시 — Phase 4b-2
- ❌ 대시보드 차트 — Phase 4c
- ❌ 엑셀 import — Phase 5+
- ❌ 월 사이 이전/다음 버튼 (← →) — 사이드바로 충분, UI 중복
- ❌ year 접힘 상태 localStorage persist — 단순화
- ❌ 월 비교 / 검색 / 필터 — Phase 5+
- ❌ 월 삭제 / 복제 — 의도적으로 막음 (실수 방지). 거래 다 지우면 빈 월은 있어도 OK
- ❌ 한 번에 여러 월 생성 — "다음 월" 하나만 (PRD)
- ❌ breadcrumb (가계부 > 2026년 > 5월) — 사이드바 트리가 역할
