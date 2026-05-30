# Phase 4a: 인증 + 설정 UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자가 Google OAuth로 로그인해서 가계부 시드 데이터(카테고리/결제수단/고정지출)를 입력할 수 있는 상태를 만든다.

**Architecture:** Next 14 App Router + Server Components(read) + Server Actions(write) + `@supabase/ssr` cookie session. 3개 설정 화면은 `/budget/settings/<resource>` 라우트. `middleware.ts`로 `/budget/*` 보호. UI 인터랙티브 부분만 Client Components.

**Tech Stack:** Next.js 14, TypeScript, Tailwind, shadcn/ui (v4 + base-ui), Supabase Auth (Google OAuth), `@supabase/ssr`, Zod, sonner toast.

**Spec:** `docs/superpowers/specs/2026-05-30-phase4a-design.md`

---

## 사전 상태

- 디렉토리: `/Users/seungsoosmacbook/Desktop/seungsoo-life/`
- 최근 커밋: `6af501a docs: Phase 4a 인증 + 설정 UI 설계 spec 작성`
- Phase 3 완료: 6테이블 + RLS + 잔고 트리거 적용된 Supabase 프로젝트 (ref `iwrcprtjyxzfsriiupsw`)
- Google OAuth: Supabase dashboard에서 활성화됨 (provider 공유 — Phase 3 USER PAUSE에서 설정)
- `.env.local`: Supabase URL + anon key 채워짐
- 기존 코드:
  - `lib/supabase/client.ts`, `lib/supabase/server.ts` — Phase 2에서 작성
  - `components/ui/button.tsx` — shadcn
  - `components/common/GlobalHeader.tsx` — Phase 2 (가계부/일기장/운동기록 nav)
  - `app/layout.tsx` — Phase 2 (Inter 폰트, GlobalHeader, main)
  - `app/budget/page.tsx` — placeholder ("준비 중입니다")
- `pnpm build`, `pnpm lint`, `pnpm exec tsc --noEmit` 모두 통과 상태

## 파일 구조 (Phase 4a 종료 시)

| 경로 | 책임 | 만드는 Task |
|---|---|---|
| `middleware.ts` (프로젝트 루트) | `/budget/*` 인증 보호 + signin 리다이렉트 | Task 2 |
| `app/signin/page.tsx` | Google OAuth 로그인 시작 (client) | Task 3 |
| `app/auth/callback/route.ts` | OAuth code → session 교환 (route handler) | Task 3 |
| `lib/actions/auth.ts` | signOut server action | Task 4 |
| `components/common/UserMenu.tsx` | 이메일 아바타 + 로그아웃 드롭다운 (client) | Task 4 |
| `components/common/GlobalHeader.tsx` | (수정) user prop 추가 + UserMenu 렌더 | Task 4 |
| `app/layout.tsx` | (수정) user fetch + Toaster + GlobalHeader props | Task 4 |
| `app/budget/settings/layout.tsx` | sub-nav 공통 헤더 | Task 6 |
| `components/budget/settings/SettingsSubNav.tsx` | 3 탭 (카테고리/결제수단/고정지출) (client) | Task 6 |
| `app/budget/settings/categories/page.tsx` | server fetch → CategoryTree props | Task 6 (placeholder) → Task 8 (실제) |
| `app/budget/settings/payment-methods/page.tsx` | server fetch → PaymentMethodList props | Task 6 (placeholder) → Task 10 (실제) |
| `app/budget/settings/fixed-expenses/page.tsx` | server fetch → FixedExpenseTable props | Task 6 (placeholder) → Task 13 (실제) |
| `lib/types/database.ts` | Supabase MCP 생성 TypeScript 타입 | Task 1 |
| `lib/validators/categories.ts` | Zod 스키마 (Add/Update) | Task 7 |
| `lib/actions/categories.ts` | 4 server actions | Task 7 |
| `components/budget/settings/CategoryTree.tsx` | 트리 컨테이너 (client) | Task 8 |
| `components/budget/settings/CategoryRowForm.tsx` | view/edit/add 인라인 (client) | Task 8 |
| `components/budget/settings/DeleteConfirmDialog.tsx` | 삭제 확인 모달 (3 화면 공용, client) | Task 8 |
| `lib/validators/payment-methods.ts` | Zod 스키마 | Task 9 |
| `lib/actions/payment-methods.ts` | 4 server actions | Task 9 |
| `components/budget/settings/PaymentMethodList.tsx` | 인라인 리스트 + ↑↓ + toggle (client) | Task 10 |
| `lib/validators/fixed-expenses.ts` | Zod 스키마 | Task 12 |
| `lib/actions/fixed-expenses.ts` | 3 server actions | Task 12 |
| `components/budget/settings/CategoryDropdowns.tsx` | 1차→2차 cascade dropdown (client, 4b 재사용) | Task 13 |
| `components/budget/settings/FixedExpenseTable.tsx` | 8컬럼 테이블 컨테이너 (client) | Task 13 |
| `components/budget/settings/FixedExpenseRow.tsx` | 한 행 인라인 편집 (client) | Task 13 |
| `package.json` | (수정) zod 추가 | Task 1 |
| `components/ui/*` | (자동 생성) shadcn 5종 — dropdown-menu, dialog, switch, select, sonner | Task 1 |

총 신규 파일 ~17개 (shadcn 자동 생성 5개 제외), 수정 ~3개.

---

## Task 1: 의존성 + shadcn 컴포넌트 + TypeScript 타입

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`
- Create: `components/ui/dropdown-menu.tsx`, `components/ui/dialog.tsx`, `components/ui/switch.tsx`, `components/ui/select.tsx`, `components/ui/sonner.tsx` (shadcn 자동 생성)
- Create: `lib/types/database.ts` (Supabase MCP 생성)

**작업 디렉토리:** `/Users/seungsoosmacbook/Desktop/seungsoo-life/`

- [ ] **Step 1: zod 설치**

Run:
```bash
cd /Users/seungsoosmacbook/Desktop/seungsoo-life
pnpm add zod
```

Expected: `package.json`의 `dependencies`에 `zod` 추가. lockfile 갱신.

- [ ] **Step 2: shadcn 컴포넌트 5개 추가**

Run:
```bash
pnpm dlx shadcn@4.8.1 add dropdown-menu dialog switch select sonner --yes
```

Expected: `components/ui/` 아래 5개 파일 생성. `package.json`에 필요한 base-ui peer 추가될 수 있음. 만약 대화형 프롬프트 뜨면 모두 default 선택.

만약 shadcn이 일부 컴포넌트만 인식하고 나머지 모름 에러: 컴포넌트명을 하나씩 추가:
```bash
pnpm dlx shadcn@4.8.1 add dropdown-menu --yes
pnpm dlx shadcn@4.8.1 add dialog --yes
pnpm dlx shadcn@4.8.1 add switch --yes
pnpm dlx shadcn@4.8.1 add select --yes
pnpm dlx shadcn@4.8.1 add sonner --yes
```

- [ ] **Step 3: TypeScript 타입 생성 (Supabase MCP)**

MCP 호출:
```
mcp__claude_ai_Supabase__generate_typescript_types
project_id: "iwrcprtjyxzfsriiupsw"
```

응답의 `types` 필드(string) 내용을 `lib/types/database.ts`에 그대로 write. 헤더 주석 추가:

파일 시작에 다음 한 줄 주석 추가 (실제 생성 내용 위에):
```ts
// Auto-generated by Supabase MCP generate_typescript_types. Do not edit manually.
// Regenerate after schema changes via: mcp__claude_ai_Supabase__generate_typescript_types
```

- [ ] **Step 4: 빌드 검증**

Run:
```bash
pnpm build 2>&1 | tail -10
echo "---TSC---"
pnpm exec tsc --noEmit 2>&1 | tail -3
echo "EXIT: $?"
```

Expected: build 성공 + tsc exit 0. 새 shadcn 컴포넌트들과 `database.ts` 모두 타입 에러 없어야 함.

만약 shadcn 컴포넌트 추가로 새 deps가 build script 승인 필요해서 `pnpm-workspace.yaml`에 자동 추가됐다면 그대로 두기 (Phase 2 패턴).

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "chore(deps): zod + shadcn 5컴포넌트 + Supabase types 추가"
```

---

## Task 2: 인증 미들웨어

**Files:**
- Create: `middleware.ts` (프로젝트 루트)

- [ ] **Step 1: middleware.ts 작성**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/middleware.ts`:

```ts
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const isSignIn = url.pathname === "/signin"
  const isBudget = url.pathname.startsWith("/budget")

  if (!user && isBudget) {
    url.pathname = "/signin"
    url.searchParams.set(
      "next",
      request.nextUrl.pathname + request.nextUrl.search
    )
    return NextResponse.redirect(url)
  }

  if (user && isSignIn) {
    url.pathname = "/budget"
    url.searchParams.delete("next")
    url.searchParams.delete("error")
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ["/budget/:path*", "/signin"],
}
```

- [ ] **Step 2: 빌드 검증**

Run:
```bash
pnpm build 2>&1 | tail -8
```

Expected: 성공. 미들웨어가 별도 라우트로 컴파일됨 (`/middleware` 표시 또는 build summary에 middleware bundle 표시).

- [ ] **Step 3: 동작 검증 (현재 placeholder 페이지로)**

Run (백그라운드 dev):
```bash
pnpm dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
sleep 6
echo "---/budget 접근 (미인증)---"
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/budget
echo "---/budget/anything 접근---"
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/budget/settings/categories
echo "---/ (인증 안 필요) 접근---"
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/
echo "---/diary (인증 안 필요)---"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/diary
kill $DEV_PID 2>/dev/null
sleep 1
```

Expected:
- `/budget` → `307 http://localhost:3000/signin?next=%2Fbudget` (또는 비슷)
- `/budget/settings/categories` → `307 ... signin?next=%2Fbudget%2Fsettings%2Fcategories`
- `/` → `307 ... budget` 후 다시 signin 리다이렉트 (또는 `/`는 인증 무관이라 200, 그리고 redirect to /budget이 어딘가에서 일어남)
- `/diary` → `200` (직접 접근 가능)

루트 `/`는 `app/page.tsx`의 `redirect('/budget')`로 인해 `/budget` 시도 → 미들웨어가 signin으로 보냄. 따라서 최종적으로 signin에 도달. 이는 의도된 동작.

`/signin` 페이지는 다음 Task에서 만드니까 지금 접근하면 404 — 정상.

- [ ] **Step 4: 커밋**

```bash
git add middleware.ts
git commit -m "feat(auth): /budget/* 보호 미들웨어 + /signin 리다이렉트"
```

---

## Task 3: Sign-in 페이지 + OAuth callback

**Files:**
- Create: `app/signin/page.tsx`
- Create: `app/auth/callback/route.ts`

- [ ] **Step 1: app/signin/page.tsx 작성**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/app/signin/page.tsx`:

```tsx
"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export default function SigninPage() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const error = searchParams.get("error")
    if (error) toast.error(`로그인 실패: ${error}`)
  }, [searchParams])

  const handleSignIn = async () => {
    setLoading(true)
    const next = searchParams.get("next") ?? "/budget"
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
    if (error) {
      toast.error(`로그인 실패: ${error.message}`)
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-neutral-200 p-8 text-center">
        <div>
          <h1 className="text-2xl font-bold">승수 라이프</h1>
          <p className="mt-2 text-sm text-neutral-500">
            일상의 반복 작업을 모두 하나의 통합 PWA로
          </p>
        </div>
        <Button onClick={handleSignIn} disabled={loading} className="w-full">
          {loading ? "이동 중..." : "Google로 로그인"}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: app/auth/callback/route.ts 작성**

Run:
```bash
mkdir -p /Users/seungsoosmacbook/Desktop/seungsoo-life/app/auth/callback
```

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/app/auth/callback/route.ts`:

```ts
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/budget"

  if (!code) {
    return NextResponse.redirect(`${origin}/signin?error=missing_code`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      `${origin}/signin?error=${encodeURIComponent(error.message)}`
    )
  }

  return NextResponse.redirect(`${origin}${next}`)
}
```

- [ ] **Step 3: 빌드 + 라우트 표시 검증**

Run:
```bash
pnpm build 2>&1 | grep -E "/signin|/auth/callback" ; echo "---"
pnpm build 2>&1 | tail -5
```

Expected: build summary에 `/signin` (Static) + `/auth/callback` (Dynamic) 표시. 전체 build 성공.

- [ ] **Step 4: 미들웨어 + signin 통합 검증**

Run:
```bash
pnpm dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
sleep 6
echo "---/budget → signin redirect---"
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/budget
echo "---/signin 페이지 컨텐츠 (Google 로그인 버튼)---"
curl -s http://localhost:3000/signin | grep -o "Google로 로그인" | head -1
echo "---/signin?error=missing_code (에러 표시)---"
curl -s "http://localhost:3000/signin?error=missing_code" | grep -o "승수 라이프" | head -1
echo "---/auth/callback (code 없으면 redirect)---"
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/auth/callback
kill $DEV_PID 2>/dev/null
sleep 1
```

Expected:
- `/budget`: 307 → signin
- `/signin` 컨텐츠: "Google로 로그인" 텍스트 존재
- `/signin?error=...`: "승수 라이프" 텍스트 존재 (페이지 정상 렌더)
- `/auth/callback` (code 없음): 307 → `/signin?error=missing_code`

실제 Google OAuth는 USER MANUAL (Task 5)에서 검증.

- [ ] **Step 5: 커밋**

```bash
git add app/signin app/auth
git commit -m "feat(auth): signin 페이지 + OAuth callback route handler"
```

---

## Task 4: signOut + UserMenu + GlobalHeader + layout 통합

**Files:**
- Create: `lib/actions/auth.ts`
- Create: `components/common/UserMenu.tsx`
- Modify: `components/common/GlobalHeader.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: lib/actions/auth.ts 작성**

Run:
```bash
mkdir -p /Users/seungsoosmacbook/Desktop/seungsoo-life/lib/actions
```

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/lib/actions/auth.ts`:

```ts
"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/signin")
}
```

- [ ] **Step 2: components/common/UserMenu.tsx 작성**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/components/common/UserMenu.tsx`:

```tsx
"use client"

import { signOut } from "@/lib/actions/auth"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function UserMenu({ email }: { email: string }) {
  const initials = email.slice(0, 2).toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200 text-xs font-medium hover:bg-neutral-300"
          aria-label="사용자 메뉴"
        >
          {initials}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="font-normal text-neutral-500">
          {email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <form action={signOut}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full text-left">
              로그아웃
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 3: GlobalHeader.tsx 수정 (user prop 추가)**

기존 `/Users/seungsoosmacbook/Desktop/seungsoo-life/components/common/GlobalHeader.tsx`를 다음으로 교체:

```tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { UserMenu } from "@/components/common/UserMenu"

const NAV_ITEMS = [
  { label: "가계부", href: "/budget" },
  { label: "일기장", href: "/diary" },
  { label: "운동기록", href: "/workout" },
] as const

export function GlobalHeader({ user }: { user: { email: string } | null }) {
  const pathname = usePathname()

  return (
    <header className="border-b border-neutral-200">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm transition-colors",
                  isActive
                    ? "font-bold underline underline-offset-4"
                    : "text-neutral-600 hover:text-neutral-900"
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
        {user ? <UserMenu email={user.email} /> : null}
      </nav>
    </header>
  )
}
```

- [ ] **Step 4: app/layout.tsx 수정 (user fetch + Toaster)**

기존 `/Users/seungsoosmacbook/Desktop/seungsoo-life/app/layout.tsx`를 다음으로 교체:

```tsx
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { GlobalHeader } from "@/components/common/GlobalHeader"
import { Toaster } from "@/components/ui/sonner"
import { createClient } from "@/lib/supabase/server"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "승수 라이프",
  description: "일상의 반복 작업을 모두 하나의 통합 PWA로",
  manifest: "/manifest.json",
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <html lang="ko">
      <body className={inter.className}>
        <GlobalHeader user={user ? { email: user.email ?? "" } : null} />
        <main>{children}</main>
        <Toaster />
      </body>
    </html>
  )
}
```

`RootLayout`이 `async`가 됐다는 점 주의 (Server Component이므로 OK).

- [ ] **Step 5: 빌드 검증**

Run:
```bash
pnpm build 2>&1 | tail -10
echo "---TSC---"
pnpm exec tsc --noEmit 2>&1 | tail -3 ; echo "EXIT: $?"
```

Expected: build 성공, tsc exit 0.

만약 `await createClient()` 관련 타입 에러: `lib/supabase/server.ts`의 `createClient`가 async인지 확인 (Phase 2에서 `async`로 작성됨).

만약 `Toaster` import 에러: shadcn sonner가 `components/ui/sonner.tsx`에서 `Toaster` named export하는지 확인 — shadcn 기본은 named export. 다르면 default export 사용.

- [ ] **Step 6: 커밋**

```bash
git add lib/actions components/common app/layout.tsx
git commit -m "feat(auth): UserMenu + GlobalHeader user prop + layout user fetch + Toaster"
```

---

## Task 5: USER MANUAL — Gate A 인증 흐름 검증

**Files:** (없음 — 브라우저 수동 작업)

- [ ] **Step 1: dev 서버 띄우기**

Run (백그라운드):
```bash
cd /Users/seungsoosmacbook/Desktop/seungsoo-life
pnpm dev > /tmp/dev.log 2>&1 &
echo "dev server PID: $!"
sleep 5
```

Expected: dev 서버 listening on http://localhost:3000.

- [ ] **Step 2: 사용자에게 검증 단계 출력 (USER PAUSE)**

다음을 사용자에게 그대로 출력:

```
🔴 USER PAUSE — Gate A 인증 흐름 검증

1단계: 로그아웃 상태에서 /budget 접근
  - 브라우저에서 http://localhost:3000/budget/settings/categories 입력
  - 자동으로 /signin?next=/budget/settings/categories 로 리다이렉트되어야 함
  - "Google로 로그인" 버튼이 보이는 카드 페이지가 떠야 함

2단계: Google 로그인
  - "Google로 로그인" 클릭
  - Google consent screen → 본인 이메일 선택 → 동의
  - 자동으로 /budget/settings/categories 로 돌아와야 함
  - 단, 현재 settings 페이지는 아직 안 만들어져서 404일 수 있음 (정상 — Task 6에서 만듦)
  - URL이 /budget/settings/categories로 변한 것만 확인하면 OK

3단계: 글로벌 헤더 UserMenu 확인
  - 우상단에 이메일 첫 두 글자 (예: "SS") 원형 아바타 표시
  - 클릭 → 드롭다운 (이메일 풀 + "로그아웃" 항목)

4단계: 로그아웃 → 다시 보호 흐름
  - "로그아웃" 클릭
  - 자동으로 /signin 으로 이동
  - 우상단 UserMenu 사라짐
  - http://localhost:3000/budget 다시 접근 → 다시 /signin 리다이렉트

5단계: 인증 안 필요 페이지 확인
  - http://localhost:3000/diary 접근 → 일기장 placeholder 페이지 표시 (로그인 강제 X)
  - http://localhost:3000/workout 도 동일

다섯 단계 다 통과하면 채팅에 "Gate A 통과"라고 알려줘.
실패하면 어느 단계에서 어떤 에러가 났는지 알려줘.
```

- [ ] **Step 3: 사용자 응답 대기**

사용자가 보고할 때까지 진행하지 않음.

- [ ] **Step 4: dev 서버 종료**

```bash
pkill -f "pnpm dev|next dev" 2>/dev/null
sleep 1
```

**커밋 없음** (검증만)

---

## Task 6: 설정 sub-nav layout + 3 placeholder 페이지

**Files:**
- Create: `app/budget/settings/layout.tsx`
- Create: `components/budget/settings/SettingsSubNav.tsx`
- Create: `app/budget/settings/categories/page.tsx` (placeholder)
- Create: `app/budget/settings/payment-methods/page.tsx` (placeholder)
- Create: `app/budget/settings/fixed-expenses/page.tsx` (placeholder)

- [ ] **Step 1: 디렉토리 생성**

Run:
```bash
mkdir -p /Users/seungsoosmacbook/Desktop/seungsoo-life/app/budget/settings/categories
mkdir -p /Users/seungsoosmacbook/Desktop/seungsoo-life/app/budget/settings/payment-methods
mkdir -p /Users/seungsoosmacbook/Desktop/seungsoo-life/app/budget/settings/fixed-expenses
mkdir -p /Users/seungsoosmacbook/Desktop/seungsoo-life/components/budget/settings
```

- [ ] **Step 2: SettingsSubNav 작성**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/components/budget/settings/SettingsSubNav.tsx`:

```tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const TABS = [
  { label: "카테고리", href: "/budget/settings/categories" },
  { label: "결제수단", href: "/budget/settings/payment-methods" },
  { label: "고정지출", href: "/budget/settings/fixed-expenses" },
] as const

export function SettingsSubNav() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-6 border-b border-neutral-200">
      {TABS.map((tab) => {
        const isActive = pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "border-b-2 px-1 py-3 text-sm transition-colors",
              isActive
                ? "border-neutral-900 font-semibold text-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-900"
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 3: settings/layout.tsx 작성**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/app/budget/settings/layout.tsx`:

```tsx
import Link from "next/link"
import { SettingsSubNav } from "@/components/budget/settings/SettingsSubNav"

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Link
        href="/budget"
        className="text-sm text-neutral-500 hover:text-neutral-900"
      >
        ← 가계부로 돌아가기
      </Link>
      <h1 className="mt-4 text-2xl font-bold">⚙️ 설정</h1>
      <div className="mt-6">
        <SettingsSubNav />
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 3개 placeholder 페이지 작성**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/app/budget/settings/categories/page.tsx`:

```tsx
export default function CategoriesPage() {
  return (
    <p className="text-sm text-neutral-500">카테고리 설정 (Task 8에서 완성)</p>
  )
}
```

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/app/budget/settings/payment-methods/page.tsx`:

```tsx
export default function PaymentMethodsPage() {
  return (
    <p className="text-sm text-neutral-500">결제수단 설정 (Task 10에서 완성)</p>
  )
}
```

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/app/budget/settings/fixed-expenses/page.tsx`:

```tsx
export default function FixedExpensesPage() {
  return (
    <p className="text-sm text-neutral-500">고정지출 설정 (Task 13에서 완성)</p>
  )
}
```

- [ ] **Step 5: 빌드 + 라우트 검증**

Run:
```bash
pnpm build 2>&1 | grep -E "budget/settings|/budget" ; echo "---"
pnpm build 2>&1 | tail -5
```

Expected: build 성공. 라우트 목록에 `/budget/settings/categories`, `/budget/settings/payment-methods`, `/budget/settings/fixed-expenses` 표시.

- [ ] **Step 6: 커밋**

```bash
git add app/budget/settings components/budget/settings/SettingsSubNav.tsx
git commit -m "feat(settings): sub-nav layout + 3 placeholder 페이지"
```

---

## Task 7: 카테고리 validators + server actions

**Files:**
- Create: `lib/validators/categories.ts`
- Create: `lib/actions/categories.ts`

- [ ] **Step 1: validators 디렉토리 + Zod 스키마 작성**

Run:
```bash
mkdir -p /Users/seungsoosmacbook/Desktop/seungsoo-life/lib/validators
```

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/lib/validators/categories.ts`:

```ts
import { z } from "zod"

export const AddCategorySchema = z.object({
  name: z.string().min(1, "이름은 필수").max(60, "이름은 60자 이내"),
  type: z.enum(["income", "expense"]),
  parent_id: z.string().uuid().nullable(),
})

export const UpdateCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "이름은 필수").max(60, "이름은 60자 이내"),
})

export const DeleteCategorySchema = z.object({
  id: z.string().uuid(),
})

export const ReorderCategoriesSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
  type: z.enum(["income", "expense"]),
  parent_id: z.string().uuid().nullable(),
})

export type AddCategoryInput = z.infer<typeof AddCategorySchema>
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>
export type DeleteCategoryInput = z.infer<typeof DeleteCategorySchema>
export type ReorderCategoriesInput = z.infer<typeof ReorderCategoriesSchema>
```

- [ ] **Step 2: server actions 작성**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/lib/actions/categories.ts`:

```ts
"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  AddCategorySchema,
  UpdateCategorySchema,
  DeleteCategorySchema,
  ReorderCategoriesSchema,
  type AddCategoryInput,
  type UpdateCategoryInput,
  type DeleteCategoryInput,
  type ReorderCategoriesInput,
} from "@/lib/validators/categories"

type Result = { ok: true } | { ok: false; error: string }

async function getAuthedClient() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "로그인 필요" as const }
  return { supabase, user }
}

export async function addCategory(input: AddCategoryInput): Promise<Result> {
  const parsed = AddCategorySchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if ("error" in ctx) return { ok: false, error: ctx.error }
  const { supabase, user } = ctx

  const { data: maxRow } = await supabase
    .from("categories")
    .select("sort_order")
    .eq("user_id", user.id)
    .eq("type", parsed.data.type)
    .is("parent_id", parsed.data.parent_id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextSort = (maxRow?.sort_order ?? 0) + 1

  const { error } = await supabase.from("categories").insert({
    name: parsed.data.name,
    type: parsed.data.type,
    parent_id: parsed.data.parent_id,
    sort_order: nextSort,
    user_id: user.id,
  })

  if (error) return { ok: false, error: error.message }
  revalidatePath("/budget/settings/categories")
  return { ok: true }
}

export async function updateCategory(
  input: UpdateCategoryInput
): Promise<Result> {
  const parsed = UpdateCategorySchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if ("error" in ctx) return { ok: false, error: ctx.error }
  const { supabase } = ctx

  const { error } = await supabase
    .from("categories")
    .update({ name: parsed.data.name })
    .eq("id", parsed.data.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath("/budget/settings/categories")
  return { ok: true }
}

export async function deleteCategory(
  input: DeleteCategoryInput
): Promise<Result> {
  const parsed = DeleteCategorySchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if ("error" in ctx) return { ok: false, error: ctx.error }
  const { supabase } = ctx

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", parsed.data.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath("/budget/settings/categories")
  return { ok: true }
}

export async function reorderCategories(
  input: ReorderCategoriesInput
): Promise<Result> {
  const parsed = ReorderCategoriesSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if ("error" in ctx) return { ok: false, error: ctx.error }
  const { supabase, user } = ctx

  for (let i = 0; i < parsed.data.ids.length; i++) {
    const { error } = await supabase
      .from("categories")
      .update({ sort_order: i + 1 })
      .eq("id", parsed.data.ids[i])
      .eq("user_id", user.id)
    if (error) return { ok: false, error: error.message }
  }

  revalidatePath("/budget/settings/categories")
  return { ok: true }
}
```

- [ ] **Step 3: 타입체크 + 빌드 검증**

Run:
```bash
pnpm exec tsc --noEmit 2>&1 | tail -5
echo "EXIT: $?"
pnpm build 2>&1 | tail -5
```

Expected: tsc exit 0. build 성공. Supabase 클라이언트의 `from('categories')`가 `database.ts` 타입으로 추론되어야 함 (자동완성 + 컴파일 통과).

- [ ] **Step 4: 커밋**

```bash
git add lib/validators/categories.ts lib/actions/categories.ts
git commit -m "feat(categories): Zod validators + 4 server actions"
```

---

## Task 8: 카테고리 UI (Tree + RowForm + DeleteConfirmDialog)

**Files:**
- Create: `components/budget/settings/DeleteConfirmDialog.tsx`
- Create: `components/budget/settings/CategoryRowForm.tsx`
- Create: `components/budget/settings/CategoryTree.tsx`
- Modify: `app/budget/settings/categories/page.tsx` (placeholder → 실제)

- [ ] **Step 1: DeleteConfirmDialog 작성 (3 화면 공용)**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/components/budget/settings/DeleteConfirmDialog.tsx`:

```tsx
"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  message: string
  onConfirm: () => Promise<void> | void
}) {
  const [pending, setPending] = useState(false)

  const handleConfirm = async () => {
    setPending(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="whitespace-pre-line">
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={pending}
          >
            {pending ? "삭제 중..." : "삭제"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: CategoryRowForm 작성 (3 모드: view/edit/add)**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/components/budget/settings/CategoryRowForm.tsx`:

```tsx
"use client"

import { useState, useRef, useEffect, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  addCategory,
  updateCategory,
} from "@/lib/actions/categories"
import { toast } from "sonner"

type Mode = "view" | "edit" | "add"

export function CategoryRowForm({
  category,
  type,
  parentId,
  onEnterEdit,
  onCancel,
  onAskDelete,
}: {
  category?: { id: string; name: string }
  type: "income" | "expense"
  parentId: string | null
  onEnterEdit?: () => void
  onCancel?: () => void
  onAskDelete?: () => void
}) {
  const initialMode: Mode = category ? "view" : "add"
  const [mode, setMode] = useState<Mode>(initialMode)
  const [name, setName] = useState(category?.name ?? "")
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (mode === "edit" || mode === "add") inputRef.current?.focus()
  }, [mode])

  const save = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error("이름은 필수")
      return
    }
    startTransition(async () => {
      const result =
        mode === "add"
          ? await addCategory({ name: trimmed, type, parent_id: parentId })
          : await updateCategory({ id: category!.id, name: trimmed })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      if (mode === "add") {
        setName("")
        onCancel?.()
      } else {
        setMode("view")
      }
    })
  }

  const cancel = () => {
    setName(category?.name ?? "")
    if (mode === "edit") setMode("view")
    else onCancel?.()
  }

  if (mode === "view" && category) {
    return (
      <div className="flex items-center gap-2 py-1">
        <span
          className="flex-1 cursor-pointer rounded px-2 py-1 hover:bg-neutral-100"
          onClick={() => {
            setMode("edit")
            onEnterEdit?.()
          }}
        >
          {category.name}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setMode("edit")
            onEnterEdit?.()
          }}
          aria-label="편집"
        >
          ✏️
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAskDelete?.()}
          aria-label="삭제"
        >
          🗑️
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 py-1">
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save()
          if (e.key === "Escape") cancel()
        }}
        onBlur={save}
        disabled={pending}
        className="flex-1 rounded border border-neutral-300 px-2 py-1 text-sm"
        placeholder="카테고리 이름"
      />
      <Button size="sm" onClick={save} disabled={pending}>
        {pending ? "저장 중..." : mode === "add" ? "추가" : "저장"}
      </Button>
      <Button size="sm" variant="outline" onClick={cancel} disabled={pending}>
        취소
      </Button>
    </div>
  )
}
```

- [ ] **Step 3: CategoryTree 작성**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/components/budget/settings/CategoryTree.tsx`:

```tsx
"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { CategoryRowForm } from "@/components/budget/settings/CategoryRowForm"
import { DeleteConfirmDialog } from "@/components/budget/settings/DeleteConfirmDialog"
import { deleteCategory } from "@/lib/actions/categories"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type Category = {
  id: string
  name: string
  type: "income" | "expense"
  parent_id: string | null
  sort_order: number
}

export function CategoryTree({ categories }: { categories: Category[] }) {
  const groups: Record<"expense" | "income", Category[]> = {
    expense: categories.filter((c) => c.type === "expense"),
    income: categories.filter((c) => c.type === "income"),
  }

  return (
    <div className="space-y-10">
      <CategoryGroup
        title="💸 지출 카테고리"
        type="expense"
        items={groups.expense}
      />
      <CategoryGroup
        title="💰 수입 카테고리"
        type="income"
        items={groups.income}
      />
    </div>
  )
}

function CategoryGroup({
  title,
  type,
  items,
}: {
  title: string
  type: "income" | "expense"
  items: Category[]
}) {
  const [adding, setAdding] = useState(false)
  const top = items.filter((c) => c.parent_id === null)

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Button size="sm" onClick={() => setAdding(true)}>
          + 1차 카테고리 추가
        </Button>
      </div>
      <div className="divide-y divide-neutral-100 rounded border border-neutral-200">
        {top.map((primary) => (
          <PrimaryNode
            key={primary.id}
            primary={primary}
            secondaries={items.filter((c) => c.parent_id === primary.id)}
          />
        ))}
        {adding ? (
          <div className="px-3 py-1">
            <CategoryRowForm
              type={type}
              parentId={null}
              onCancel={() => setAdding(false)}
            />
          </div>
        ) : null}
        {top.length === 0 && !adding ? (
          <p className="px-3 py-4 text-sm text-neutral-500">
            아직 카테고리가 없습니다. "+ 1차 카테고리 추가"로 시작하세요.
          </p>
        ) : null}
      </div>
    </section>
  )
}

function PrimaryNode({
  primary,
  secondaries,
}: {
  primary: Category
  secondaries: Category[]
}) {
  const [expanded, setExpanded] = useState(false)
  const [addingChild, setAddingChild] = useState(false)
  const [askDelete, setAskDelete] = useState(false)
  const [_, startTransition] = useTransition()

  const onConfirmDelete = () =>
    new Promise<void>((resolve) => {
      startTransition(async () => {
        const result = await deleteCategory({ id: primary.id })
        if (!result.ok) toast.error(result.error)
        resolve()
      })
    })

  return (
    <div className={cn("px-3 py-1", expanded && "bg-neutral-50")}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-neutral-400 hover:text-neutral-700"
          aria-label={expanded ? "접기" : "펼치기"}
        >
          {expanded ? "▼" : "▶"}
        </button>
        <div className="flex-1">
          <CategoryRowForm
            category={{ id: primary.id, name: primary.name }}
            type={primary.type}
            parentId={null}
            onAskDelete={() => setAskDelete(true)}
          />
        </div>
        {!expanded && secondaries.length > 0 ? (
          <span className="text-xs text-neutral-400">({secondaries.length})</span>
        ) : null}
      </div>

      {expanded ? (
        <div className="ml-7 mt-1 space-y-1 border-l border-neutral-200 pl-3">
          {secondaries.map((sec) => (
            <SecondaryNode key={sec.id} secondary={sec} parent={primary} />
          ))}
          {addingChild ? (
            <CategoryRowForm
              type={primary.type}
              parentId={primary.id}
              onCancel={() => setAddingChild(false)}
            />
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAddingChild(true)}
              className="text-xs"
            >
              + 하위 카테고리 추가
            </Button>
          )}
        </div>
      ) : null}

      <DeleteConfirmDialog
        open={askDelete}
        onOpenChange={setAskDelete}
        title={`"${primary.name}" 삭제`}
        message={`하위 카테고리 ${secondaries.length}개도 함께 삭제됩니다.\n과거 거래의 텍스트는 그대로 유지됩니다. (스냅샷 패턴)`}
        onConfirm={onConfirmDelete}
      />
    </div>
  )
}

function SecondaryNode({
  secondary,
  parent,
}: {
  secondary: Category
  parent: Category
}) {
  const [askDelete, setAskDelete] = useState(false)
  const [_, startTransition] = useTransition()

  const onConfirmDelete = () =>
    new Promise<void>((resolve) => {
      startTransition(async () => {
        const result = await deleteCategory({ id: secondary.id })
        if (!result.ok) toast.error(result.error)
        resolve()
      })
    })

  return (
    <div>
      <CategoryRowForm
        category={{ id: secondary.id, name: secondary.name }}
        type={secondary.type}
        parentId={parent.id}
        onAskDelete={() => setAskDelete(true)}
      />
      <DeleteConfirmDialog
        open={askDelete}
        onOpenChange={setAskDelete}
        title={`"${secondary.name}" 삭제`}
        message="과거 거래의 텍스트는 그대로 유지됩니다. (스냅샷 패턴)"
        onConfirm={onConfirmDelete}
      />
    </div>
  )
}
```

- [ ] **Step 4: categories/page.tsx 교체**

기존 placeholder `/Users/seungsoosmacbook/Desktop/seungsoo-life/app/budget/settings/categories/page.tsx`를 다음으로 교체:

```tsx
import { createClient } from "@/lib/supabase/server"
import { CategoryTree } from "@/components/budget/settings/CategoryTree"

export default async function CategoriesPage() {
  const supabase = await createClient()
  const { data: categories, error } = await supabase
    .from("categories")
    .select("id, name, type, parent_id, sort_order")
    .order("type", { ascending: true })
    .order("parent_id", { ascending: true, nullsFirst: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  if (error) {
    return <p className="text-sm text-red-600">에러: {error.message}</p>
  }

  return <CategoryTree categories={categories ?? []} />
}
```

- [ ] **Step 5: 빌드 + 타입체크**

Run:
```bash
pnpm exec tsc --noEmit 2>&1 | tail -5
echo "TSC EXIT: $?"
pnpm build 2>&1 | tail -10
```

Expected: tsc + build 모두 통과. `Category` 타입이 spec 명세대로 Supabase에서 잘 추론됨.

만약 `database.ts` 타입과 충돌하는 경우 (예: Category type을 자체 정의해서 충돌): 일단 자체 타입 정의로 진행, 향후 `database.ts`의 Tables['categories']로 통합하는 건 Phase 4b에서 정리.

- [ ] **Step 6: 커밋**

```bash
git add components/budget/settings/{DeleteConfirmDialog,CategoryRowForm,CategoryTree}.tsx app/budget/settings/categories/page.tsx
git commit -m "feat(categories): 트리 UI + RowForm + DeleteConfirmDialog"
```

---

## Task 9: 결제수단 validators + server actions

**Files:**
- Create: `lib/validators/payment-methods.ts`
- Create: `lib/actions/payment-methods.ts`

- [ ] **Step 1: Zod 스키마 작성**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/lib/validators/payment-methods.ts`:

```ts
import { z } from "zod"

export const AddPaymentMethodSchema = z.object({
  name: z.string().min(1, "이름은 필수").max(60, "이름은 60자 이내"),
})

export const UpdatePaymentMethodSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(60).optional(),
  active: z.boolean().optional(),
})

export const DeletePaymentMethodSchema = z.object({
  id: z.string().uuid(),
})

export const MovePaymentMethodSchema = z.object({
  id: z.string().uuid(),
  direction: z.enum(["up", "down"]),
})

export type AddPaymentMethodInput = z.infer<typeof AddPaymentMethodSchema>
export type UpdatePaymentMethodInput = z.infer<typeof UpdatePaymentMethodSchema>
export type DeletePaymentMethodInput = z.infer<typeof DeletePaymentMethodSchema>
export type MovePaymentMethodInput = z.infer<typeof MovePaymentMethodSchema>
```

- [ ] **Step 2: server actions 작성**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/lib/actions/payment-methods.ts`:

```ts
"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  AddPaymentMethodSchema,
  UpdatePaymentMethodSchema,
  DeletePaymentMethodSchema,
  MovePaymentMethodSchema,
  type AddPaymentMethodInput,
  type UpdatePaymentMethodInput,
  type DeletePaymentMethodInput,
  type MovePaymentMethodInput,
} from "@/lib/validators/payment-methods"

type Result = { ok: true } | { ok: false; error: string }

async function getAuthedClient() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "로그인 필요" as const }
  return { supabase, user }
}

export async function addPaymentMethod(
  input: AddPaymentMethodInput
): Promise<Result> {
  const parsed = AddPaymentMethodSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if ("error" in ctx) return { ok: false, error: ctx.error }
  const { supabase, user } = ctx

  const { data: maxRow } = await supabase
    .from("payment_methods")
    .select("sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextSort = (maxRow?.sort_order ?? 0) + 1

  const { error } = await supabase.from("payment_methods").insert({
    name: parsed.data.name,
    sort_order: nextSort,
    active: true,
    user_id: user.id,
  })

  if (error) return { ok: false, error: error.message }
  revalidatePath("/budget/settings/payment-methods")
  return { ok: true }
}

export async function updatePaymentMethod(
  input: UpdatePaymentMethodInput
): Promise<Result> {
  const parsed = UpdatePaymentMethodSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if ("error" in ctx) return { ok: false, error: ctx.error }
  const { supabase } = ctx

  const patch: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) patch.name = parsed.data.name
  if (parsed.data.active !== undefined) patch.active = parsed.data.active

  const { error } = await supabase
    .from("payment_methods")
    .update(patch)
    .eq("id", parsed.data.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath("/budget/settings/payment-methods")
  return { ok: true }
}

export async function deletePaymentMethod(
  input: DeletePaymentMethodInput
): Promise<Result> {
  const parsed = DeletePaymentMethodSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if ("error" in ctx) return { ok: false, error: ctx.error }
  const { supabase } = ctx

  const { error } = await supabase
    .from("payment_methods")
    .delete()
    .eq("id", parsed.data.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath("/budget/settings/payment-methods")
  return { ok: true }
}

export async function movePaymentMethod(
  input: MovePaymentMethodInput
): Promise<Result> {
  const parsed = MovePaymentMethodSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if ("error" in ctx) return { ok: false, error: ctx.error }
  const { supabase, user } = ctx

  const { data: rows, error: fetchError } = await supabase
    .from("payment_methods")
    .select("id, sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true })

  if (fetchError) return { ok: false, error: fetchError.message }

  const idx = rows?.findIndex((r) => r.id === parsed.data.id) ?? -1
  if (idx === -1) return { ok: false, error: "결제수단을 찾을 수 없음" }

  const targetIdx = parsed.data.direction === "up" ? idx - 1 : idx + 1
  if (targetIdx < 0 || targetIdx >= (rows?.length ?? 0))
    return { ok: false, error: "더 이동할 수 없음" }

  const a = rows![idx]
  const b = rows![targetIdx]

  const { error: e1 } = await supabase
    .from("payment_methods")
    .update({ sort_order: b.sort_order })
    .eq("id", a.id)
  if (e1) return { ok: false, error: e1.message }

  const { error: e2 } = await supabase
    .from("payment_methods")
    .update({ sort_order: a.sort_order })
    .eq("id", b.id)
  if (e2) return { ok: false, error: e2.message }

  revalidatePath("/budget/settings/payment-methods")
  return { ok: true }
}
```

- [ ] **Step 3: 타입체크 + 빌드**

Run:
```bash
pnpm exec tsc --noEmit 2>&1 | tail -3 ; echo "EXIT: $?"
pnpm build 2>&1 | tail -5
```

Expected: 통과.

- [ ] **Step 4: 커밋**

```bash
git add lib/validators/payment-methods.ts lib/actions/payment-methods.ts
git commit -m "feat(payment-methods): Zod validators + 4 server actions"
```

---

## Task 10: 결제수단 UI (PaymentMethodList)

**Files:**
- Create: `components/budget/settings/PaymentMethodList.tsx`
- Modify: `app/budget/settings/payment-methods/page.tsx`

- [ ] **Step 1: PaymentMethodList 작성**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/components/budget/settings/PaymentMethodList.tsx`:

```tsx
"use client"

import { useState, useRef, useEffect, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { DeleteConfirmDialog } from "@/components/budget/settings/DeleteConfirmDialog"
import {
  addPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  movePaymentMethod,
} from "@/lib/actions/payment-methods"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type PaymentMethod = {
  id: string
  name: string
  sort_order: number
  active: boolean
}

export function PaymentMethodList({ items }: { items: PaymentMethod[] }) {
  const [adding, setAdding] = useState(false)

  return (
    <div className="rounded border border-neutral-200">
      <div className="grid grid-cols-[60px_1fr_80px_120px] gap-2 border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-500">
        <span>순서</span>
        <span>이름</span>
        <span>활성</span>
        <span className="text-right">액션</span>
      </div>

      {items.map((item, idx) => (
        <Row
          key={item.id}
          item={item}
          isFirst={idx === 0}
          isLast={idx === items.length - 1}
        />
      ))}

      <div className="border-t border-neutral-200 p-3">
        {adding ? (
          <AddForm onDone={() => setAdding(false)} />
        ) : (
          <Button size="sm" onClick={() => setAdding(true)}>
            + 결제수단 추가
          </Button>
        )}
      </div>

      {items.length === 0 && !adding ? (
        <p className="px-3 py-4 text-sm text-neutral-500">
          아직 결제수단이 없습니다.
        </p>
      ) : null}
    </div>
  )
}

function Row({
  item,
  isFirst,
  isLast,
}: {
  item: PaymentMethod
  isFirst: boolean
  isLast: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(item.name)
  const [askDelete, setAskDelete] = useState(false)
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const saveName = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error("이름은 필수")
      return
    }
    if (trimmed === item.name) {
      setEditing(false)
      return
    }
    startTransition(async () => {
      const result = await updatePaymentMethod({ id: item.id, name: trimmed })
      if (!result.ok) toast.error(result.error)
      else setEditing(false)
    })
  }

  const toggleActive = (next: boolean) => {
    startTransition(async () => {
      const result = await updatePaymentMethod({ id: item.id, active: next })
      if (!result.ok) toast.error(result.error)
    })
  }

  const move = (direction: "up" | "down") => {
    startTransition(async () => {
      const result = await movePaymentMethod({ id: item.id, direction })
      if (!result.ok) toast.error(result.error)
    })
  }

  const onConfirmDelete = () =>
    new Promise<void>((resolve) => {
      startTransition(async () => {
        const result = await deletePaymentMethod({ id: item.id })
        if (!result.ok) toast.error(result.error)
        resolve()
      })
    })

  return (
    <div
      className={cn(
        "grid grid-cols-[60px_1fr_80px_120px] items-center gap-2 border-b border-neutral-100 px-3 py-2",
        !item.active && "opacity-50"
      )}
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => move("up")}
          disabled={isFirst || pending}
          className="text-neutral-400 hover:text-neutral-700 disabled:opacity-30"
          aria-label="위로"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => move("down")}
          disabled={isLast || pending}
          className="text-neutral-400 hover:text-neutral-700 disabled:opacity-30"
          aria-label="아래로"
        >
          ↓
        </button>
      </div>

      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveName()
            if (e.key === "Escape") {
              setName(item.name)
              setEditing(false)
            }
          }}
          onBlur={saveName}
          disabled={pending}
          className="rounded border border-neutral-300 px-2 py-1 text-sm"
        />
      ) : (
        <span
          className="cursor-pointer rounded px-2 py-1 hover:bg-neutral-100"
          onClick={() => setEditing(true)}
        >
          {item.name}
        </span>
      )}

      <Switch
        checked={item.active}
        onCheckedChange={toggleActive}
        disabled={pending}
      />

      <div className="flex justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEditing(true)}
          aria-label="편집"
        >
          ✏️
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAskDelete(true)}
          aria-label="삭제"
        >
          🗑️
        </Button>
      </div>

      <DeleteConfirmDialog
        open={askDelete}
        onOpenChange={setAskDelete}
        title={`"${item.name}" 결제수단 삭제`}
        message="과거 거래의 텍스트는 그대로 유지됩니다. (스냅샷 패턴)"
        onConfirm={onConfirmDelete}
      />
    </div>
  )
}

function AddForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("")
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const save = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error("이름은 필수")
      return
    }
    startTransition(async () => {
      const result = await addPaymentMethod({ name: trimmed })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setName("")
      onDone()
    })
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save()
          if (e.key === "Escape") onDone()
        }}
        disabled={pending}
        className="flex-1 rounded border border-neutral-300 px-2 py-1 text-sm"
        placeholder="결제수단 이름 (예: 보라삼성)"
      />
      <Button size="sm" onClick={save} disabled={pending}>
        {pending ? "추가 중..." : "추가"}
      </Button>
      <Button size="sm" variant="outline" onClick={onDone} disabled={pending}>
        취소
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: payment-methods/page.tsx 교체**

기존 placeholder를 다음으로 교체:

```tsx
import { createClient } from "@/lib/supabase/server"
import { PaymentMethodList } from "@/components/budget/settings/PaymentMethodList"

export default async function PaymentMethodsPage() {
  const supabase = await createClient()
  const { data: items, error } = await supabase
    .from("payment_methods")
    .select("id, name, sort_order, active")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  if (error) {
    return <p className="text-sm text-red-600">에러: {error.message}</p>
  }

  return <PaymentMethodList items={items ?? []} />
}
```

- [ ] **Step 3: 빌드 + 타입체크**

```bash
pnpm exec tsc --noEmit 2>&1 | tail -3 ; echo "EXIT: $?"
pnpm build 2>&1 | tail -5
```

Expected: 통과.

만약 `payment_methods` 테이블 select 결과에 `created_at` 컬럼이 없다는 에러: Phase 3 마이그레이션에서 `payment_methods`는 `created_at` 컬럼이 명시되지 않음. 해결: select에서 `created_at` 제거하고 order에서도 빼고 `sort_order, id`로만 정렬. 또는 `sort_order` 단독.

수정 버전:
```ts
const { data: items, error } = await supabase
  .from("payment_methods")
  .select("id, name, sort_order, active")
  .order("sort_order", { ascending: true })
```

- [ ] **Step 4: 커밋**

```bash
git add components/budget/settings/PaymentMethodList.tsx app/budget/settings/payment-methods/page.tsx
git commit -m "feat(payment-methods): 인라인 리스트 + ↑↓ 정렬 + active toggle"
```

---

## Task 11: USER MANUAL — Gate B + Gate C 카테고리/결제수단 검증

**Files:** (없음 — 브라우저 수동)

- [ ] **Step 1: dev 서버 띄우기**

```bash
cd /Users/seungsoosmacbook/Desktop/seungsoo-life
pnpm dev > /tmp/dev.log 2>&1 &
echo "PID: $!"
sleep 5
```

- [ ] **Step 2: 사용자 안내 출력**

다음을 사용자에게 그대로 출력:

```
🔴 USER PAUSE — Gate B (카테고리) + Gate C (결제수단)

이미 로그인된 상태로 가정. 아니면 먼저 /signin → Google 로그인.

【Gate B — 카테고리 CRUD】
1. http://localhost:3000/budget/settings/categories 접근
2. "+ 1차 카테고리 추가" (지출) → "식비" 입력 → Enter
   → 트리에 "식비" 표시
3. "▶ 식비" 클릭하여 펼치기 → "+ 하위 카테고리 추가" → "배달식사" → Enter
   → 들여쓰기로 "배달식사" 표시
4. "배달식사" 이름 클릭 → "배달"로 수정 → Enter
   → 변경 반영
5. "식비"의 🗑️ 클릭 → 모달 확인 ("하위 1개도 함께 삭제. 과거 거래 텍스트 유지")
   → "삭제" 클릭 → 사라짐
6. 페이지 새로고침 → 변경 유지 확인
7. 수입 카테고리도 동일하게 1차+2차 1개씩 추가 → 표시 확인

【Gate C — 결제수단 CRUD】
1. /budget/settings/payment-methods 클릭 (sub-nav)
2. "+ 결제수단 추가" → "보라삼성" 입력 → Enter
3. 다시 추가 → "삼성", "신한" 추가 → 3행
4. "삼성"의 ↓ 클릭 → 순서가 보라삼성 → 신한 → 삼성으로 변경
5. "삼성"의 활성 toggle 클릭 → off → dim 표시 (행이 흐릿)
6. 다시 toggle on → 정상 표시
7. 새로고침 → 순서/활성 상태 유지

다 통과하면 "Gate B + C 통과"라고 알려줘. 실패하면 어느 step에서 무슨 일.
```

- [ ] **Step 3: 사용자 응답 대기 + dev 서버 종료**

응답 받은 후:
```bash
pkill -f "pnpm dev|next dev" 2>/dev/null
sleep 1
```

**커밋 없음**

---

## Task 12: 고정지출 validators + server actions

**Files:**
- Create: `lib/validators/fixed-expenses.ts`
- Create: `lib/actions/fixed-expenses.ts`

- [ ] **Step 1: Zod 스키마 작성**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/lib/validators/fixed-expenses.ts`:

```ts
import { z } from "zod"

export const AddFixedExpenseSchema = z.object({
  day_of_month: z
    .number()
    .int("일자는 정수")
    .min(1, "1-31 사이")
    .max(31, "1-31 사이"),
  type: z.enum(["income", "expense"]),
  category_1st: z.string().min(1, "1차 카테고리는 필수"),
  category_2nd: z.string().optional().nullable(),
  payment_method: z.string().optional().nullable(),
  description: z.string().max(200).optional().nullable(),
  amount: z.number().positive("금액은 양수"),
})

export const UpdateFixedExpenseSchema = AddFixedExpenseSchema.partial().extend({
  id: z.string().uuid(),
  active: z.boolean().optional(),
})

export const DeleteFixedExpenseSchema = z.object({
  id: z.string().uuid(),
})

export type AddFixedExpenseInput = z.infer<typeof AddFixedExpenseSchema>
export type UpdateFixedExpenseInput = z.infer<typeof UpdateFixedExpenseSchema>
export type DeleteFixedExpenseInput = z.infer<typeof DeleteFixedExpenseSchema>
```

- [ ] **Step 2: server actions 작성**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/lib/actions/fixed-expenses.ts`:

```ts
"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  AddFixedExpenseSchema,
  UpdateFixedExpenseSchema,
  DeleteFixedExpenseSchema,
  type AddFixedExpenseInput,
  type UpdateFixedExpenseInput,
  type DeleteFixedExpenseInput,
} from "@/lib/validators/fixed-expenses"

type Result =
  | { ok: true; id?: string }
  | { ok: false; error: string }

async function getAuthedClient() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "로그인 필요" as const }
  return { supabase, user }
}

export async function addFixedExpense(
  input: AddFixedExpenseInput
): Promise<Result> {
  const parsed = AddFixedExpenseSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if ("error" in ctx) return { ok: false, error: ctx.error }
  const { supabase, user } = ctx

  const { data, error } = await supabase
    .from("fixed_expenses")
    .insert({
      day_of_month: parsed.data.day_of_month,
      type: parsed.data.type,
      category_1st: parsed.data.category_1st,
      category_2nd: parsed.data.category_2nd ?? null,
      payment_method: parsed.data.payment_method ?? null,
      description: parsed.data.description ?? null,
      amount: parsed.data.amount,
      active: true,
      user_id: user.id,
    })
    .select("id")
    .single()

  if (error) return { ok: false, error: error.message }
  revalidatePath("/budget/settings/fixed-expenses")
  return { ok: true, id: data?.id }
}

export async function updateFixedExpense(
  input: UpdateFixedExpenseInput
): Promise<Result> {
  const parsed = UpdateFixedExpenseSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if ("error" in ctx) return { ok: false, error: ctx.error }
  const { supabase } = ctx

  const { id, ...rest } = parsed.data
  const patch: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(rest)) {
    if (v !== undefined) patch[k] = v
  }

  if (Object.keys(patch).length === 0) return { ok: true }

  const { error } = await supabase
    .from("fixed_expenses")
    .update(patch)
    .eq("id", id)

  if (error) return { ok: false, error: error.message }
  revalidatePath("/budget/settings/fixed-expenses")
  return { ok: true }
}

export async function deleteFixedExpense(
  input: DeleteFixedExpenseInput
): Promise<Result> {
  const parsed = DeleteFixedExpenseSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if ("error" in ctx) return { ok: false, error: ctx.error }
  const { supabase } = ctx

  const { error } = await supabase
    .from("fixed_expenses")
    .delete()
    .eq("id", parsed.data.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath("/budget/settings/fixed-expenses")
  return { ok: true }
}
```

- [ ] **Step 3: 타입체크 + 빌드**

```bash
pnpm exec tsc --noEmit 2>&1 | tail -3 ; echo "EXIT: $?"
pnpm build 2>&1 | tail -5
```

Expected: 통과.

- [ ] **Step 4: 커밋**

```bash
git add lib/validators/fixed-expenses.ts lib/actions/fixed-expenses.ts
git commit -m "feat(fixed-expenses): Zod validators + 3 server actions"
```

---

## Task 13: CategoryDropdowns + 고정지출 UI (FixedExpenseTable + Row)

**Files:**
- Create: `components/budget/settings/CategoryDropdowns.tsx`
- Create: `components/budget/settings/FixedExpenseTable.tsx`
- Create: `components/budget/settings/FixedExpenseRow.tsx`
- Modify: `app/budget/settings/fixed-expenses/page.tsx`

- [ ] **Step 1: CategoryDropdowns 작성 (4b 재사용 가능)**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/components/budget/settings/CategoryDropdowns.tsx`:

```tsx
"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type CategoryOption = {
  id: string
  name: string
  type: "income" | "expense"
  parent_id: string | null
}

export function CategoryDropdowns({
  categories,
  type,
  value1st,
  value2nd,
  onChange,
  disabled,
}: {
  categories: CategoryOption[]
  type: "income" | "expense"
  value1st?: string | null
  value2nd?: string | null
  onChange: (next: { category_1st?: string | null; category_2nd?: string | null }) => void
  disabled?: boolean
}) {
  const primaries = categories.filter(
    (c) => c.type === type && c.parent_id === null
  )
  const selectedPrimary = primaries.find((p) => p.name === value1st)
  const secondaries = selectedPrimary
    ? categories.filter((c) => c.parent_id === selectedPrimary.id)
    : []

  // Fragment 반환 — 부모가 grid면 2 cell, 부모가 단순 div면 부모가 wrap 책임
  // 사용 예 (standalone): <div className="flex gap-2"><CategoryDropdowns ... /></div>
  // 사용 예 (in grid): <div className="grid grid-cols-[... 1fr 1fr ...]"><CategoryDropdowns ... /></div>
  return (
    <>
      <Select
        value={value1st ?? ""}
        onValueChange={(v) =>
          onChange({ category_1st: v, category_2nd: null })
        }
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder="1차" />
        </SelectTrigger>
        <SelectContent>
          {primaries.map((p) => (
            <SelectItem key={p.id} value={p.name}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value2nd ?? ""}
        onValueChange={(v) => onChange({ category_2nd: v })}
        disabled={disabled || !selectedPrimary || secondaries.length === 0}
      >
        <SelectTrigger>
          <SelectValue
            placeholder={
              !selectedPrimary
                ? "—"
                : secondaries.length === 0
                ? "(없음)"
                : "2차"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {secondaries.map((s) => (
            <SelectItem key={s.id} value={s.name}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )
}
```

- [ ] **Step 2: FixedExpenseRow 작성**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/components/budget/settings/FixedExpenseRow.tsx`:

```tsx
"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
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

export type FixedExpenseRow = {
  id: string  // "temp-..." for new unsaved rows
  day_of_month: number | null
  type: "income" | "expense"
  category_1st: string | null
  category_2nd: string | null
  payment_method: string | null
  description: string | null
  amount: number | null
  active: boolean
}

export function FixedExpenseRowComponent({
  row,
  categories,
  paymentMethods,
  onRemove,
  onPersisted,
}: {
  row: FixedExpenseRow
  categories: CategoryOption[]
  paymentMethods: { id: string; name: string }[]
  onRemove: (id: string) => void
  onPersisted: (tempId: string, newId: string) => void
}) {
  const [draft, setDraft] = useState<FixedExpenseRow>(row)
  const [askDelete, setAskDelete] = useState(false)
  const [pending, startTransition] = useTransition()
  const isNew = draft.id.startsWith("temp-")

  const allRequiredFilled =
    draft.day_of_month !== null &&
    draft.day_of_month >= 1 &&
    draft.day_of_month <= 31 &&
    !!draft.category_1st &&
    draft.amount !== null &&
    draft.amount > 0

  const persist = (next: FixedExpenseRow) => {
    if (!allRequiredFilledOf(next)) return  // 필수 미충족이면 저장 안 함

    startTransition(async () => {
      if (isNew) {
        const result = await addFixedExpense({
          day_of_month: next.day_of_month!,
          type: next.type,
          category_1st: next.category_1st!,
          category_2nd: next.category_2nd ?? null,
          payment_method: next.payment_method ?? null,
          description: next.description ?? null,
          amount: next.amount!,
        })
        if (!result.ok) {
          toast.error(result.error)
          return
        }
        if (result.id) onPersisted(draft.id, result.id)
      } else {
        const result = await updateFixedExpense({
          id: next.id,
          day_of_month: next.day_of_month ?? undefined,
          type: next.type,
          category_1st: next.category_1st ?? undefined,
          category_2nd: next.category_2nd,
          payment_method: next.payment_method,
          description: next.description,
          amount: next.amount ?? undefined,
          active: next.active,
        })
        if (!result.ok) toast.error(result.error)
      }
    })
  }

  const update = (patch: Partial<FixedExpenseRow>) => {
    const next = { ...draft, ...patch }
    setDraft(next)
    // active toggle / type 변경 / 카테고리 변경은 즉시 저장 시도
    if (
      patch.active !== undefined ||
      patch.type !== undefined ||
      patch.category_1st !== undefined ||
      patch.category_2nd !== undefined ||
      patch.payment_method !== undefined
    ) {
      persist(next)
    }
  }

  const onBlurField = () => {
    persist(draft)
  }

  const onConfirmDelete = () =>
    new Promise<void>((resolve) => {
      if (isNew) {
        onRemove(draft.id)
        resolve()
        return
      }
      startTransition(async () => {
        const result = await deleteFixedExpense({ id: draft.id })
        if (!result.ok) toast.error(result.error)
        resolve()
      })
    })

  const activePM = paymentMethods  // 부모가 이미 active만 전달

  return (
    <div
      className={cn(
        "grid grid-cols-[40px_60px_80px_1fr_1fr_120px_1fr_120px_40px] items-center gap-2 border-b border-neutral-100 px-3 py-2 text-sm",
        !draft.active && "opacity-50"
      )}
    >
      <Switch
        checked={draft.active}
        onCheckedChange={(v) => update({ active: v })}
        disabled={pending}
      />

      <input
        type="number"
        min={1}
        max={31}
        value={draft.day_of_month ?? ""}
        onChange={(e) =>
          setDraft({
            ...draft,
            day_of_month: e.target.value ? Number(e.target.value) : null,
          })
        }
        onBlur={onBlurField}
        disabled={pending}
        className="w-full rounded border border-neutral-300 px-2 py-1"
        placeholder="일"
      />

      <Select
        value={draft.type}
        onValueChange={(v) =>
          update({ type: v as "income" | "expense", category_1st: null, category_2nd: null })
        }
        disabled={pending}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="expense">출금</SelectItem>
          <SelectItem value="income">수입</SelectItem>
        </SelectContent>
      </Select>

      <CategoryDropdowns
        categories={categories}
        type={draft.type}
        value1st={draft.category_1st}
        value2nd={draft.category_2nd}
        onChange={(next) =>
          update({
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
      {/* CategoryDropdowns가 fragment로 2 grid cell (1차 + 2차) 채움 */}

      <Select
        value={draft.payment_method ?? ""}
        onValueChange={(v) => update({ payment_method: v || null })}
        disabled={pending}
      >
        <SelectTrigger>
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          {activePM.map((pm) => (
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
        onBlur={onBlurField}
        disabled={pending}
        className="w-full rounded border border-neutral-300 px-2 py-1"
        placeholder="설명"
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
        onBlur={onBlurField}
        disabled={pending}
        className="w-full rounded border border-neutral-300 px-2 py-1 text-right"
        placeholder="금액"
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
        title="고정지출 삭제"
        message="이 고정지출을 삭제합니다. 이미 생성된 거래는 영향 없음."
        onConfirm={onConfirmDelete}
      />
    </div>
  )
}

function allRequiredFilledOf(r: FixedExpenseRow): boolean {
  return (
    r.day_of_month !== null &&
    r.day_of_month >= 1 &&
    r.day_of_month <= 31 &&
    !!r.category_1st &&
    r.amount !== null &&
    r.amount > 0
  )
}
```

- [ ] **Step 3: FixedExpenseTable 작성**

Write to `/Users/seungsoosmacbook/Desktop/seungsoo-life/components/budget/settings/FixedExpenseTable.tsx`:

```tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  FixedExpenseRowComponent,
  type FixedExpenseRow,
} from "@/components/budget/settings/FixedExpenseRow"
import type { CategoryOption } from "@/components/budget/settings/CategoryDropdowns"

export function FixedExpenseTable({
  rows,
  categories,
  paymentMethods,
}: {
  rows: FixedExpenseRow[]
  categories: CategoryOption[]
  paymentMethods: { id: string; name: string }[]
}) {
  const [tempRows, setTempRows] = useState<FixedExpenseRow[]>([])

  const allRows = [...rows, ...tempRows]

  const addEmptyRow = () => {
    setTempRows((prev) => [
      ...prev,
      {
        id: `temp-${crypto.randomUUID()}`,
        day_of_month: null,
        type: "expense",
        category_1st: null,
        category_2nd: null,
        payment_method: null,
        description: null,
        amount: null,
        active: true,
      },
    ])
  }

  const removeTempRow = (id: string) => {
    setTempRows((prev) => prev.filter((r) => r.id !== id))
  }

  const onPersisted = (tempId: string, _newId: string) => {
    // 저장 성공 → temp 행 제거 (revalidatePath로 실제 행이 rows props에 등장)
    setTempRows((prev) => prev.filter((r) => r.id !== tempId))
  }

  return (
    <div className="rounded border border-neutral-200">
      <div className="grid grid-cols-[40px_60px_80px_1fr_1fr_120px_1fr_120px_40px] gap-2 border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-500">
        <span>활성</span>
        <span>일</span>
        <span>종류</span>
        <span>1차</span>
        <span>2차</span>
        <span>결제수단</span>
        <span>설명</span>
        <span className="text-right">금액</span>
        <span />
      </div>

      {allRows.length === 0 ? (
        <p className="px-3 py-4 text-sm text-neutral-500">
          아직 고정지출이 없습니다. 하단 "+ 새 행"으로 추가하세요.
        </p>
      ) : (
        allRows.map((row) => (
          <FixedExpenseRowComponent
            key={row.id}
            row={row}
            categories={categories}
            paymentMethods={paymentMethods}
            onRemove={removeTempRow}
            onPersisted={onPersisted}
          />
        ))
      )}

      <div className="border-t border-neutral-200 p-3">
        <Button size="sm" onClick={addEmptyRow}>
          + 새 행
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: fixed-expenses/page.tsx 교체**

기존 placeholder를 다음으로 교체:

```tsx
import { createClient } from "@/lib/supabase/server"
import { FixedExpenseTable } from "@/components/budget/settings/FixedExpenseTable"
import type { FixedExpenseRow } from "@/components/budget/settings/FixedExpenseRow"

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
      .order("created_at", { ascending: true }),
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

  return (
    <FixedExpenseTable
      rows={rows}
      categories={(categories ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type as "income" | "expense",
        parent_id: c.parent_id,
      }))}
      paymentMethods={paymentMethods ?? []}
    />
  )
}
```

- [ ] **Step 5: 빌드 + 타입체크**

```bash
pnpm exec tsc --noEmit 2>&1 | tail -5
echo "TSC EXIT: $?"
pnpm build 2>&1 | tail -10
```

Expected: 통과.

만약 `crypto.randomUUID()` 타입 에러: tsconfig의 lib에 `webworker`가 추가되어 있어서 OK (Phase 3 Task 4에서 추가됨). 만약 에러 나면 `'uuid'` 패키지 추가 (`pnpm add uuid` + `pnpm add -D @types/uuid`)로 우회.

만약 Tailwind grid columns 클래스(`grid-cols-[40px_60px_...]`)가 작동 안 함: arbitrary value 형식이라 빌드는 통과해도 런타임에 일부 브라우저에서 분리. 대안: `tailwind.config.ts`의 `theme.extend.gridTemplateColumns`에 명시.

- [ ] **Step 6: 커밋**

```bash
git add components/budget/settings/{CategoryDropdowns,FixedExpenseTable,FixedExpenseRow}.tsx app/budget/settings/fixed-expenses/page.tsx
git commit -m "feat(fixed-expenses): CategoryDropdowns 재사용 + 8컬럼 인라인 테이블"
```

---

## Task 14: USER MANUAL — Gate D 고정지출 검증

**Files:** (없음 — 브라우저 수동)

- [ ] **Step 1: dev 서버 띄우기**

```bash
cd /Users/seungsoosmacbook/Desktop/seungsoo-life
pnpm dev > /tmp/dev.log 2>&1 &
echo "PID: $!"
sleep 5
```

- [ ] **Step 2: 사용자 안내 출력**

```
🔴 USER PAUSE — Gate D 고정지출 인라인 테이블

전제: Gate B에서 카테고리 일부 + Gate C에서 결제수단 일부 입력 완료.
만약 안 했으면 먼저 카테고리 ("주거/월세", "주거/가스비", "통신/휴대폰") + 결제수단 ("보라삼성", "삼성") 추가.

1. http://localhost:3000/budget/settings/fixed-expenses 접근
2. "+ 새 행" 클릭 → 빈 행 추가
3. 셀 채우기:
   - 활성: 그대로 ON
   - 일: 25
   - 종류: 출금
   - 1차: 주거 (드롭다운에서 선택)
   - 2차: 월세 (1차 선택 후 자동으로 활성화됨)
   - 결제수단: 보라삼성
   - 설명: 서대문 빌라
   - 금액: 650000
   - blur 또는 다른 셀로 이동 → 저장됨 (필수 필드 다 채워지면)
4. 두 번째 행 "+ 새 행" → 다른 데이터 (일: 10, 종류: 출금, 1차: 통신, 2차: 휴대폰, 결제수단: 삼성, 설명: KT, 금액: 70000)
5. 첫 행의 1차를 "주거" → "통신"으로 변경 → 2차가 자동 초기화 (빈값)
   → 2차를 "휴대폰"으로 다시 선택
6. 첫 행의 활성 toggle OFF → 행이 흐리게 표시
7. 두 번째 행의 🗑️ → 모달 → 삭제 → 사라짐
8. 페이지 새로고침 → 첫 행 그대로, 흐림 표시 유지

다 통과하면 "Gate D 통과" 알려줘.
```

- [ ] **Step 3: 사용자 응답 대기 + dev 서버 종료**

```bash
pkill -f "pnpm dev|next dev" 2>/dev/null
sleep 1
```

**커밋 없음**

---

## Task 15: Final verification (Gate E) + ADR 알림

**Files:** (없음 — 확인만)

- [ ] **Step 1: 빌드/린트/타입체크**

Run:
```bash
cd /Users/seungsoosmacbook/Desktop/seungsoo-life
pnpm build 2>&1 | tail -10
echo "---LINT---"
pnpm lint 2>&1 | tail -3
echo "---TSC---"
pnpm exec tsc --noEmit 2>&1 | tail -3
echo "TSC EXIT: $?"
```

Expected: 세 가지 모두 통과.

만약 ESLint warning이 새로 발생: 보통 unused imports 또는 `any` 사용. 가능하면 수정해서 통과. 정 안 되면 사용자에게 보고하고 진행 여부 묻기.

- [ ] **Step 2: git 상태 확인**

Run:
```bash
git status --short
git log --oneline -15
git ls-files | grep "\.env\.local$" ; echo "(empty = OK)"
```

Expected:
- `git status --short`: 빈 출력 (working tree clean)
- `git log`: Phase 4a 커밋들 + 이전 커밋들
- `.env.local` 추적 안 됨

- [ ] **Step 3: Supabase 상태 점검 (선택)**

MCP 호출:
```
mcp__claude_ai_Supabase__execute_sql
project_id: "iwrcprtjyxzfsriiupsw"
query: |
  select 'profiles' as t, count(*) from public.profiles
  union all select 'categories', count(*) from public.categories
  union all select 'payment_methods', count(*) from public.payment_methods
  union all select 'fixed_expenses', count(*) from public.fixed_expenses
  order by t;
```

Expected: profiles 최소 1 (test user), 나머지는 사용자가 게이트 검증에서 입력한 만큼.

- [ ] **Step 4: ADR 알림 출력**

사용자에게 다음 메시지 출력:

```
🎉 Phase 4a 완료.

✅ Gate A: 인증 흐름 (signin → Google → callback → 보호된 페이지)
✅ Gate B: 카테고리 CRUD (트리 + 인라인 편집 + 스냅샷 안내 삭제)
✅ Gate C: 결제수단 CRUD (인라인 리스트 + ↑↓ + active toggle)
✅ Gate D: 고정지출 8컬럼 인라인 테이블 (1차→2차 cascade)
✅ Gate E: pnpm build / lint / tsc 통과, git clean

⚠️ Notion 업데이트 필요 — ADR 3건 (가계부 모듈 페이지 §14 누적)

ADR-008: 데이터 mutation 패턴 — Server Components + Server Actions + 일부 Client Components
- 일자: 2026-05-30
- 결정: 데이터 fetch는 Server Components, mutation은 "use server" Server Actions, 인터랙티브 부분만 Client Components. RPC / API route 사용 안 함.
- 이유: Next 14 App Router 권장. 보안 강화 (DB 호출이 서버에만). 코드 간결. PRD에 명시 안 됨이라 ADR.
- 영향: lib/actions/ 디렉토리, 모든 page.tsx는 server component, 컴포넌트 일부에 'use client'.

ADR-009: Zod로 server input validation (React Hook Form 안 씀)
- 일자: 2026-05-30
- 결정: PRD에 "폼: React Hook Form + Zod" 명시되었으나 Server Actions 패턴에선 React Hook Form 불필요. Zod만 채택.
- 이유: Server Actions는 폼 직접 처리 (FormData / props). Client-side form state 라이브러리는 인터랙티브 폼이 거의 없는 4a에선 과함. 향후 4b의 인라인 테이블 등에서 필요하면 그때 도입.
- 영향: package.json (zod 추가, react-hook-form 미설치), lib/validators/.

ADR-010: drag-and-drop 정렬 4a 미포함 (↑↓ 버튼만)
- 일자: 2026-05-30
- 결정: 결제수단 정렬은 ↑↓ 버튼 (sort_order swap). @dnd-kit 등 라이브러리 추가 안 함.
- 이유: YAGNI. drag-drop 라이브러리 추가 비용(번들 크기, 학습) > 가치. 사용 후 답답하면 4b 이후 추가 가능.
- 영향: PaymentMethodList.tsx, 향후 카테고리/고정지출에 drag 적용 시 별도 ADR.
```

**커밋 없음** (확인 단계)

---

## Final Verification Summary

모든 Task 완료 후 다음 상태가 보장됨:

- [ ] zod + shadcn 5컴포넌트 설치 (Task 1)
- [ ] `lib/types/database.ts` Supabase 타입 생성 (Task 1)
- [ ] `middleware.ts` 인증 미들웨어 (Task 2)
- [ ] `/signin` 페이지 + `/auth/callback` route handler (Task 3)
- [ ] UserMenu + GlobalHeader user prop + layout user fetch + Toaster (Task 4)
- [ ] Gate A 사용자 검증 통과 (Task 5)
- [ ] settings/layout + SettingsSubNav + 3 placeholder (Task 6)
- [ ] 카테고리 validators + actions + UI (Task 7-8)
- [ ] 결제수단 validators + actions + UI (Task 9-10)
- [ ] Gate B + C 사용자 검증 통과 (Task 11)
- [ ] 고정지출 validators + actions (Task 12)
- [ ] CategoryDropdowns + FixedExpenseTable + Row (Task 13)
- [ ] Gate D 사용자 검증 통과 (Task 14)
- [ ] Gate E 빌드/린트/타입체크 통과 (Task 15)
- [ ] ADR-008/009/010 사용자에게 보고됨

---

## 트러블슈팅

**shadcn add가 React 19 경고 또는 v4 컴포넌트 충돌:**
- shadcn v4.8.1 고정 (Phase 2 ADR-002 기준)
- 만약 install 중 base-ui peer 충돌이 뜨면 `pnpm install --force` 시도

**Server Action에서 `RLS policy` 관련 에러:**
- `await supabase.auth.getUser()`로 user 받았는지 확인
- `user_id: user.id` 명시 INSERT 했는지 확인
- Supabase MCP `get_advisors` 실행해서 RLS 누락 경고 없는지 점검

**`crypto.randomUUID()` 타입 에러:**
- tsconfig.json `lib`에 `dom` 또는 `webworker` 포함 확인 (Phase 3에서 추가됨)
- 안 되면 `Math.random().toString(36).slice(2)` 임시값으로 대체

**Tailwind `grid-cols-[...]` arbitrary value가 빌드 시 purge:**
- `tailwind.config.ts`의 `content`에 `./components/**/*.{ts,tsx}` 포함 확인 (Phase 2에서 OK)
- 또는 명시적으로 `theme.extend.gridTemplateColumns` 추가

**`exchangeCodeForSession` 에러 (callback에서):**
- Google OAuth client의 redirect URI가 정확히 `https://<ref>.supabase.co/auth/v1/callback` 맞는지 확인 (사용자의 우리 도메인 X)
- Supabase dashboard → Auth → Providers → Google → Enabled + 키 입력됐는지 확인

**dev에서 hot reload 후 session 끊김:**
- 일반적이지만 거슬리면 브라우저 새로고침으로 재인증

**`updateFixedExpense`에서 `Object.keys(patch)` 항상 비어있어 보임:**
- Spread operator로 undefined를 omit해야 함 (현재 코드에서 처리)
- 디버깅: `console.log(patch)` 추가 (server log)

---

## 의도적으로 안 함 (이 plan의 범위 밖)

- 거래 입력 (Phase 4b)
- 월별 페이지 + 사이드바 (Phase 4b)
- 다음 월 생성 버튼 (Phase 4b)
- 대시보드 차트 (Phase 4c)
- 5년 엑셀 import (Phase 5+)
- 시드 데이터 자동 입력 (사용자 수동)
- Drag-and-drop 정렬 (ADR-010)
- React Hook Form (ADR-009)
- Optimistic UI useOptimistic
- Realtime subscriptions
- 카테고리 색상/아이콘
- 다중 OAuth provider
- i18n
