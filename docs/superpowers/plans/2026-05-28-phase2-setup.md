# Phase 2: 통합 PWA 환경 셋업 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 통합 PWA "승수 라이프"의 빈 골격을 만든다 — Next.js 14 + TypeScript + Tailwind + shadcn/ui + Serwist(PWA) + Supabase 클라이언트가 셋업되고, 글로벌 헤더(가계부/일기장/운동기록)와 각 placeholder 페이지가 동작하는 상태.

**Architecture:** App Router 기반의 단일 Next.js 앱. 모든 모듈은 `/<module>` URL 아래에 위치하고 글로벌 헤더로 전환. Supabase는 `@supabase/ssr`로 브라우저/서버 클라이언트 분리. PWA는 Serwist로 처리. 실제 모듈 기능은 후속 Phase에서 추가.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Serwist, @supabase/supabase-js, @supabase/ssr, pnpm

**Spec:** `docs/superpowers/specs/2026-05-28-phase2-setup-design.md`

---

## 사전 상태

- 현재 디렉토리: `/Users/seungsoosmacbook/Desktop/seungsoo-life/`
- 이미 존재: `CLAUDE.md`, `docs/`, `.git/` (`c390e9a` 커밋 1개 — 스펙 + CLAUDE.md)
- pnpm이 시스템에 있어야 함. 없으면: `npm install -g pnpm`

## 파일 구조 (최종)

| 경로 | 책임 | 만드는 Task |
|---|---|---|
| `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `next-env.d.ts`, `.eslintrc.json`, `app/globals.css`, `app/layout.tsx` (기본), `app/page.tsx` (기본), `app/favicon.ico` | create-next-app 산출물 | Task 1 |
| `components.json`, `lib/utils.ts`, `components/ui/button.tsx` | shadcn/ui 초기화 산출물 | Task 2 |
| `lib/supabase/client.ts`, `lib/supabase/server.ts` | Supabase 클라이언트 (브라우저/서버) | Task 3 |
| `app/sw.ts`, `next.config.mjs` (수정), `public/sw.js` (빌드 산출물) | Serwist 서비스 워커 | Task 4 |
| `app/budget/page.tsx`, `app/diary/page.tsx`, `app/workout/page.tsx`, `components/budget/.gitkeep` | 모듈 placeholder | Task 5 |
| `components/common/GlobalHeader.tsx`, `app/layout.tsx` (수정), `app/page.tsx` (수정) | 글로벌 헤더 + 루트 redirect | Task 6 |
| `public/manifest.json`, `public/icons/icon-192.png`, `public/icons/icon-512.png` | PWA manifest + 아이콘 placeholder | Task 7 |
| `.env.local.example` | Supabase env 자리 | Task 8 |
| `.gitignore` (수정) | Serwist 산출물 + .env.local 제외 | Task 9 |
| `README.md` | 프로젝트 문서 | Task 10 |

---

## Task 1: Next.js 14 프로젝트 초기화

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `next-env.d.ts`, `.eslintrc.json`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `app/favicon.ico`, `pnpm-lock.yaml`, `public/next.svg`, `public/vercel.svg`
- 작업 디렉토리: `/Users/seungsoosmacbook/Desktop/seungsoo-life/`

- [ ] **Step 1: pnpm 설치 확인**

Run: `pnpm --version`
Expected: 8.x 이상 버전 출력. 없으면 `npm install -g pnpm` 실행 후 재시도.

- [ ] **Step 2: create-next-app 실행**

빈 디렉토리가 아니라(이미 CLAUDE.md, docs/, .git/ 존재) `.` 대상으로 실행. create-next-app은 비어있지 않은 디렉토리에 대해 확인 프롬프트를 띄울 수 있으니 `--yes`와 동등한 비-인터랙티브 플래그를 사용해야 함.

Run:
```bash
pnpm create next-app@14 . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*" \
  --use-pnpm
```

Expected: 정상 종료. `package.json`, `tsconfig.json`, `app/`, `tailwind.config.ts` 등 생성. 종료 코드 0.

만약 디렉토리 비어있지 않다고 거부되면: 이미 들어있는 파일(CLAUDE.md, docs/, .git/)은 그대로 두고 create-next-app은 충돌 없이 추가만 함. 14.x의 create는 보통 무시하고 진행. 거부될 경우 `--force` 플래그가 없으니, 임시 해결로 `pnpm dlx create-next-app@14 ...`로 동일 명령 재시도. 그래도 실패하면 `tmp-next/` 서브디렉토리에 만들고 내용을 루트로 이동하는 fallback.

- [ ] **Step 3: 설치 검증 — dev 서버 한 번 띄워보기**

Run (백그라운드 X, 5초 후 SIGINT):
```bash
timeout 10 pnpm dev || true
```
또는 단순히:
```bash
pnpm build
```

Expected: `pnpm build`가 에러 없이 통과. `.next/` 디렉토리 생성. "Compiled successfully" 메시지.

- [ ] **Step 4: package.json 버전 확인**

Read: `package.json`
Expected `dependencies`:
- `next`: `14.x.x` (정확히 14 메이저)
- `react`: `^18`
- `react-dom`: `^18`
Expected `devDependencies`:
- `typescript`: `^5`
- `tailwindcss`: `^3`
- `eslint`: `^8`
- `eslint-config-next`: `14.x.x`

만약 next 메이저 버전이 14가 아니면 (15가 깔렸다면): `pnpm remove next eslint-config-next && pnpm add next@14 && pnpm add -D eslint-config-next@14` 후 재빌드.

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "chore: Next.js 14 + TypeScript + Tailwind 초기화"
```

---

## Task 2: shadcn/ui 초기화 + button 컴포넌트

**Files:**
- Create: `components.json`, `lib/utils.ts`, `components/ui/button.tsx`
- Modify: `app/globals.css` (shadcn CSS 변수 추가), `tailwind.config.ts` (shadcn 플러그인/색상)

- [ ] **Step 1: shadcn init 실행**

Run:
```bash
pnpm dlx shadcn@latest init -d
```

`-d`는 defaults 사용(neutral baseColor, CSS variables, RSC yes, components alias `@/components`, utils alias `@/lib/utils`, react-server-components 활성). 대화형 프롬프트가 떠도 모두 Enter로 디폴트 수락.

만약 `-d` 플래그가 새 버전에서 다른 의미라면, 명시적으로:
```bash
pnpm dlx shadcn@latest init \
  --defaults \
  --yes
```

Expected: `components.json`, `lib/utils.ts` 생성. `app/globals.css`에 `@layer base` CSS variables 추가. `tailwind.config.ts`에 `darkMode`, `colors` 확장 추가. 종료 코드 0.

- [ ] **Step 2: button 컴포넌트 추가**

Run:
```bash
pnpm dlx shadcn@latest add button --yes
```

Expected: `components/ui/button.tsx` 생성. `class-variance-authority`, `@radix-ui/react-slot` 의존성 추가됨.

- [ ] **Step 3: lib/utils.ts 내용 검증**

Read: `lib/utils.ts`
Expected: 다음과 정확히 일치하거나 매우 유사
```ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 4: 빌드 검증**

Run: `pnpm build`
Expected: 에러 없이 통과.

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "chore: shadcn/ui 초기화 (neutral) + button 컴포넌트"
```

---

## Task 3: Supabase 클라이언트 설치 + 래퍼 작성

**Files:**
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`
- Modify: `package.json` (의존성 추가)

- [ ] **Step 1: 의존성 설치**

Run:
```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

Expected: `package.json`의 `dependencies`에 두 패키지 추가. lockfile 갱신.

- [ ] **Step 2: 브라우저 클라이언트 작성**

Create: `lib/supabase/client.ts`
```ts
import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3: 서버 클라이언트 작성**

Create: `lib/supabase/server.ts`
```ts
import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Server Component에서 호출되면 무시 (middleware가 처리)
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options })
          } catch {
            // Server Component에서 호출되면 무시
          }
        },
      },
    }
  )
}
```

- [ ] **Step 4: 타입 체크**

Run: `pnpm exec tsc --noEmit`
Expected: 에러 없음. `process.env.NEXT_PUBLIC_*`는 string | undefined지만 `!`로 단언했으니 OK.

만약 `cookies()` 관련 타입 오류가 뜨면 Next.js 14의 `next/headers` `cookies()`는 sync인지 async인지 버전 확인. Next 14에선 sync — `const cookieStore = cookies()`로 충분.

- [ ] **Step 5: 빌드 검증**

Run: `pnpm build`
Expected: 통과. `NEXT_PUBLIC_*` 환경 변수가 없어도 빌드 시점에는 문제 없음 (런타임에 평가됨, 클라이언트는 클릭/요청 시 평가).

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat: Supabase 클라이언트 셋업 (@supabase/ssr 기반)"
```

---

## Task 4: Serwist 설치 + PWA 설정

**Files:**
- Create: `app/sw.ts`
- Modify: `next.config.mjs`
- Modify: `package.json` (의존성 추가)

- [ ] **Step 1: Serwist 의존성 설치**

Run:
```bash
pnpm add @serwist/next serwist
```

Expected: `package.json`에 두 패키지 추가.

- [ ] **Step 2: 서비스 워커 엔트리 작성**

Create: `app/sw.ts`
```ts
import { defaultCache } from "@serwist/next/worker"
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist"
import { Serwist } from "serwist"

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
})

serwist.addEventListeners()
```

- [ ] **Step 3: next.config.mjs 수정**

Modify: `next.config.mjs`

create-next-app이 생성한 초기 파일은 다음과 유사:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
```

다음으로 교체:
```js
import withSerwistInit from "@serwist/next"

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
})

/** @type {import('next').NextConfig} */
const nextConfig = {}

export default withSerwist(nextConfig)
```

- [ ] **Step 4: 빌드로 SW 생성 검증**

Run: `pnpm build`
Expected: 통과. 빌드 후 `public/sw.js` 파일 생성됨.

확인:
```bash
ls public/sw.js
```
Expected: 파일 존재.

만약 Serwist 타입 충돌이 뜨면: `tsconfig.json`의 `include`에 `app/sw.ts`가 들어 있는지 확인 (보통 `"**/*.ts"`로 포함됨).

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat: Serwist PWA 설정 (app/sw.ts + withSerwist 래퍼) [ADR-001]"
```

ADR-001 태그는 CLAUDE.md의 컨벤션에 따라 PWA 라이브러리 변경(next-pwa → Serwist)에 대한 추적.

---

## Task 5: 모듈 placeholder 페이지 + 폴더 구조

**Files:**
- Create: `app/budget/page.tsx`, `app/diary/page.tsx`, `app/workout/page.tsx`
- Create: `components/budget/.gitkeep`, `components/common/.gitkeep` (다음 Task에서 GlobalHeader가 생기면 common/.gitkeep은 제거)

- [ ] **Step 1: budget placeholder**

Create: `app/budget/page.tsx`
```tsx
export default function BudgetPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">가계부</h1>
      <p className="mt-2 text-neutral-500">준비 중입니다.</p>
    </div>
  )
}
```

- [ ] **Step 2: diary placeholder**

Create: `app/diary/page.tsx`
```tsx
export default function DiaryPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">일기장</h1>
      <p className="mt-2 text-neutral-500">준비 중입니다.</p>
    </div>
  )
}
```

- [ ] **Step 3: workout placeholder**

Create: `app/workout/page.tsx`
```tsx
export default function WorkoutPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">운동기록</h1>
      <p className="mt-2 text-neutral-500">준비 중입니다.</p>
    </div>
  )
}
```

- [ ] **Step 4: components/budget/ 디렉토리 생성**

Run:
```bash
mkdir -p components/budget
touch components/budget/.gitkeep
```

(Phase 4에서 가계부 컴포넌트가 들어갈 자리)

- [ ] **Step 5: 빌드 검증**

Run: `pnpm build`
Expected: 통과. 빌드 로그에서 `/budget`, `/diary`, `/workout` 라우트가 ○ (Static) 로 표시됨.

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat: 모듈 placeholder 페이지 (budget/diary/workout)"
```

---

## Task 6: GlobalHeader 컴포넌트 + 루트 layout 마운트 + 루트 redirect

**Files:**
- Create: `components/common/GlobalHeader.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: GlobalHeader 작성**

Create: `components/common/GlobalHeader.tsx`
```tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { label: "가계부", href: "/budget" },
  { label: "일기장", href: "/diary" },
  { label: "운동기록", href: "/workout" },
] as const

export function GlobalHeader() {
  const pathname = usePathname()

  return (
    <header className="border-b border-neutral-200">
      <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
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
      </nav>
    </header>
  )
}
```

- [ ] **Step 2: app/layout.tsx 수정**

create-next-app이 생성한 `app/layout.tsx`는 다음과 유사:
```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

다음으로 교체:
```tsx
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { GlobalHeader } from "@/components/common/GlobalHeader"
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <GlobalHeader />
        <main>{children}</main>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: app/page.tsx 수정 (루트 redirect)**

create-next-app이 만든 `app/page.tsx`는 Next.js 기본 랜딩 페이지인데, 통째로 교체:

```tsx
import { redirect } from "next/navigation"

export default function RootPage() {
  redirect("/budget")
}
```

- [ ] **Step 4: 빌드 검증**

Run: `pnpm build`
Expected: 통과.

- [ ] **Step 5: dev 서버로 수동 검증**

Run (백그라운드 또는 별도 터미널):
```bash
pnpm dev
```

브라우저 또는 curl로 확인:
```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" -L http://localhost:3000/
curl -s http://localhost:3000/budget | grep -o "가계부" | head -1
curl -s http://localhost:3000/diary | grep -o "일기장" | head -1
curl -s http://localhost:3000/workout | grep -o "운동기록" | head -1
```

Expected:
- 루트는 307 (또는 200 after follow)로 /budget으로 리다이렉트
- /budget HTML에 "가계부" 텍스트 존재
- /diary HTML에 "일기장" 텍스트 존재
- /workout HTML에 "운동기록" 텍스트 존재

Dev 서버 종료: Ctrl+C

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat: 글로벌 헤더 + 루트 layout + /budget 리다이렉트"
```

---

## Task 7: PWA manifest + 아이콘 placeholder

**Files:**
- Create: `public/manifest.json`, `public/icons/icon-192.png`, `public/icons/icon-512.png`

- [ ] **Step 1: manifest.json 작성**

Create: `public/manifest.json`
```json
{
  "name": "승수 라이프",
  "short_name": "승수라이프",
  "description": "일상의 반복 작업을 모두 하나의 통합 PWA로",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#ffffff",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

- [ ] **Step 2: 아이콘 placeholder 생성**

진짜 이미지가 필요해서, ImageMagick이 있으면 단색 PNG로 생성. 없으면 1×1 투명 PNG bytes를 직접 write.

ImageMagick 시도:
```bash
mkdir -p public/icons
which convert && convert -size 192x192 xc:white public/icons/icon-192.png && convert -size 512x512 xc:white public/icons/icon-512.png && echo "OK" || echo "NO_IMAGEMAGICK"
```

ImageMagick이 없으면 Node로 최소 PNG 생성:
```bash
mkdir -p public/icons
node -e "
const fs = require('fs');
const png = Buffer.from('89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000D49444154789C636060606000000005000167A0C2A50000000049454E44AE426082', 'hex');
fs.writeFileSync('public/icons/icon-192.png', png);
fs.writeFileSync('public/icons/icon-512.png', png);
"
```

(이는 1×1 픽셀 transparent PNG. manifest 검증을 통과시키기 위한 placeholder. 실제 아이콘은 MVP 직전에 디자인 단계에서 교체.)

확인:
```bash
ls -la public/icons/
```
Expected: `icon-192.png`, `icon-512.png` 둘 다 존재.

- [ ] **Step 3: 빌드 검증**

Run: `pnpm build`
Expected: 통과. (manifest는 빌드와 무관하게 static 파일로 서빙됨)

- [ ] **Step 4: 수동 검증 (선택)**

`pnpm dev` 후 브라우저 DevTools > Application > Manifest 탭에서 "승수 라이프" 표시 확인. (이 검증은 사용자가 직접; CLI에선 단순 파일 존재만)

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat: PWA manifest + 아이콘 placeholder"
```

---

## Task 8: 환경 변수 예시 파일

**Files:**
- Create: `.env.local.example`

- [ ] **Step 1: .env.local.example 작성**

Create: `.env.local.example`
```
# Supabase 프로젝트 생성 후 다음 두 값을 채워서 .env.local 파일을 만든다.
# .env.local은 git에 포함되지 않는다.
#
# Supabase 대시보드 > Project Settings > API 에서 확인:
#   - Project URL → NEXT_PUBLIC_SUPABASE_URL
#   - anon public key → NEXT_PUBLIC_SUPABASE_ANON_KEY

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

- [ ] **Step 2: 커밋**

```bash
git add .env.local.example
git commit -m "chore: .env.local.example 추가"
```

---

## Task 9: .gitignore 보강

**Files:**
- Modify: `.gitignore`

create-next-app이 만든 기본 `.gitignore`에는 이미 `.env*.local`이 포함됨. Serwist 빌드 산출물만 추가하면 됨.

- [ ] **Step 1: 현재 .gitignore 확인**

Read: `.gitignore`
Expected: `node_modules`, `.next/`, `.env*.local` 등 next.js 기본 항목 포함.

- [ ] **Step 2: Serwist 산출물 항목 추가**

Modify: `.gitignore` 파일 끝에 다음 블록 append:
```
# Serwist build artifacts
public/sw.js
public/sw.js.map
public/swe-worker-*.js
```

- [ ] **Step 3: 검증 — 추적되면 안 되는 파일이 추적 안 되는지 확인**

이전 Task에서 `pnpm build`로 `public/sw.js`가 이미 생성되어 있을 수 있다. 만약 이전에 git add됐으면 untrack 필요.

Run:
```bash
git status --short
git ls-files public/ | grep -E "sw\.js$|swe-worker"
```

Expected (두 번째 명령): 빈 결과. 만약 결과가 나오면 추적 제거:
```bash
git rm --cached public/sw.js public/sw.js.map 2>/dev/null || true
git rm --cached $(git ls-files public/ | grep swe-worker) 2>/dev/null || true
```

또한 `.env.local`이 만약 만들어졌다면 절대 커밋되지 않았는지도 확인:
```bash
git ls-files | grep "\.env\.local$"
```
Expected: 빈 결과.

- [ ] **Step 4: 커밋**

```bash
git add .gitignore
git commit -m "chore: .gitignore에 Serwist 산출물 제외 항목 추가"
```

---

## Task 10: README.md 작성

**Files:**
- Create: `README.md`

create-next-app이 생성한 기본 README는 제거하고 프로젝트 전용으로 교체.

- [ ] **Step 1: README.md 작성**

Create (또는 overwrite): `README.md`
````markdown
# 승수 라이프

일상의 반복 작업을 모두 하나의 통합 PWA로.

## 모듈 로드맵

| 순위 | 모듈 | 상태 |
|---|---|---|
| 1 | 💰 가계부 | PRD 완성, 빌드 직전 |
| 2 | 📔 일기장 | PRD 초안 |
| 3 | 💪 운동기록 | 미작성 |
| 4+ | (확장) | 필요 시 추가 |

각 모듈은 글로벌 헤더의 메뉴 한 칸을 차지하며, 공통 인증 / DB / 디자인 시스템을 공유한다.

## 기술 스택

- **Framework:** Next.js 14 (App Router) + TypeScript
- **UI:** Tailwind CSS + shadcn/ui (neutral)
- **PWA:** Serwist
- **Backend / DB:** Supabase (Postgres + Auth + RLS) — Phase 3에서 연결
- **배포:** Vercel
- **패키지 매니저:** pnpm

## 셋업

```bash
pnpm install
cp .env.local.example .env.local
# .env.local에 Supabase URL/KEY 입력 (Phase 3 이후)
pnpm dev
```

http://localhost:3000 접속 시 `/budget`으로 자동 이동.

## 스크립트

| 명령 | 설명 |
|---|---|
| `pnpm dev` | 개발 서버 (http://localhost:3000) |
| `pnpm build` | 프로덕션 빌드 + 서비스 워커 생성 |
| `pnpm start` | 프로덕션 서버 |
| `pnpm lint` | ESLint |

## 문서

- **Notion 마스터플랜:** https://www.notion.so/35acf376124680498e8ecca4a28566f3
- **가계부 모듈 PRD:** https://www.notion.so/36dcf376124681d1aed1cc5f7212ab2f
- **로컬 스펙:** `docs/superpowers/specs/`
- **로컬 구현 계획:** `docs/superpowers/plans/`
- **작업 규칙:** `CLAUDE.md`

## 동기화 원칙

코드와 PRD가 다르면 **코드가 진실**. PRD와 다른 결정을 내릴 땐 ADR로 누적하고 Notion 가계부 모듈 페이지에 추가. 자세한 규칙은 `CLAUDE.md` 참조.
````

- [ ] **Step 2: 커밋**

```bash
git add README.md
git commit -m "docs: README 작성 (프로젝트 개요 + 셋업 가이드)"
```

---

## Final Verification

모든 Task 완료 후 다음 검증을 수행. 어느 하나라도 실패하면 해당 Task로 돌아가서 수정.

- [ ] **V1: 의존성 깨끗하게 재설치**

```bash
rm -rf node_modules .next public/sw.js public/sw.js.map
pnpm install
```
Expected: 에러 없이 완료.

- [ ] **V2: 빌드 성공**

```bash
pnpm build
```
Expected: "Compiled successfully". 라우트 목록에 `/`, `/budget`, `/diary`, `/workout` 표시.

- [ ] **V3: ESLint 통과**

```bash
pnpm lint
```
Expected: "No ESLint warnings or errors" 또는 한도 내.

- [ ] **V4: dev 서버 동작 확인**

```bash
pnpm dev &
sleep 5
curl -s -o /dev/null -w "%{http_code}\n" -L http://localhost:3000/
curl -s http://localhost:3000/budget | grep -c "가계부"
curl -s http://localhost:3000/diary | grep -c "일기장"
curl -s http://localhost:3000/workout | grep -c "운동기록"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/manifest.json
kill %1 2>/dev/null
```

Expected:
- 루트: 200 (redirect 따라간 후)
- /budget, /diary, /workout: "가계부", "일기장", "운동기록" 각 1회 이상 매치
- /manifest.json: 200

- [ ] **V5: git 상태 깨끗**

```bash
git status
```
Expected: "working tree clean".

- [ ] **V6: 커밋 히스토리 확인**

```bash
git log --oneline
```
Expected: 최소 10개 커밋 (스펙 + Task 1~10 + 셋업 도중 추가 가능).

- [ ] **V7: .env.local이 추적되지 않음 확인**

```bash
git ls-files | grep "\.env\.local$"
```
Expected: 빈 결과.

- [ ] **V8: ADR 알림 출력**

작업 종료 시 사용자에게 다음 메시지 출력:
```
⚠️ Notion 업데이트 필요: ADR-001
- 결정: PWA 라이브러리로 Serwist 채택 (next-pwa 아님)
- 이유: next-pwa가 Next.js 14 App Router 공식 지원이 부재하고 유지보수가 정체. Serwist는 next-pwa의 후속 프로젝트로 App Router 호환성과 유지보수 활발.
- 영향: package.json (deps), next.config.mjs, app/sw.ts (신규)
```

---

## 트러블슈팅

**create-next-app이 빈 디렉토리가 아니라고 거부:**
이미 `.git/`, `CLAUDE.md`, `docs/`가 있어서 발생 가능. Next 14의 create는 보통 무시하고 진행하지만, 만약 거부되면 임시 디렉토리에 만들고 옮긴다:
```bash
cd /tmp && pnpm create next-app@14 _seungsoo-life-tmp --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-pnpm
cp -rn /tmp/_seungsoo-life-tmp/. /Users/seungsoosmacbook/Desktop/seungsoo-life/
rm -rf /tmp/_seungsoo-life-tmp
cd /Users/seungsoosmacbook/Desktop/seungsoo-life
```
`-n` 플래그는 기존 파일을 덮어쓰지 않음.

**shadcn init이 React 19 경고:**
Next 14는 React 18을 기본으로 깐다. shadcn 새 버전이 React 19 권장 경고를 띄울 수 있는데 기본 옵션으로 진행하면 정상 작동.

**Serwist 빌드 중 swSrc not found:**
`app/sw.ts` 파일 경로 정확한지 확인. `next.config.mjs`의 `swSrc`는 프로젝트 루트 기준 상대 경로.

**`pnpm build` 시 React Server Component 관련 에러:**
GlobalHeader가 `'use client'` 선언 했는지 확인. `usePathname()`은 client hook이라 필수.
