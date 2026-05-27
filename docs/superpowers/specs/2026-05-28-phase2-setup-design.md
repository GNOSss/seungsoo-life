# Phase 2 — 환경 셋업 설계 (Design Spec)

> 일자: 2026-05-28
> 프로젝트: 승수 라이프 (통합 PWA)
> 단계: Phase 2 (환경 셋업)
> 관련 PRD:
> - 마스터플랜: https://www.notion.so/35acf376124680498e8ecca4a28566f3
> - 가계부 모듈 PRD: https://www.notion.so/36dcf376124681d1aed1cc5f7212ab2f

---

## 1. 목적과 범위

Phase 2의 단일 목표: **다음 단계(Phase 3: 데이터 모델, Phase 4: 가계부 빌드)가 바로 시작될 수 있도록 통합 PWA "승수 라이프"의 빈 골격을 만든다.**

이 단계에서 만드는 것은 골격뿐이다. 가계부 실제 기능, 인증, DB 스키마는 모두 후속 Phase로 미룬다. Phase 2가 완료된 시점의 앱은 글로벌 헤더 3개(가계부/일기장/운동기록)를 가진 빈 PWA로, 각 탭은 placeholder 페이지만 띄운다.

## 2. 기술 스택 (확정)

PRD가 둘 이상의 옵션을 열어둔 항목은 이번 단계에서 다음과 같이 확정한다:

| 항목 | 확정 |
|---|---|
| 프레임워크 | Next.js 14 (App Router) + TypeScript |
| 스타일링 | Tailwind CSS + shadcn/ui (baseColor: neutral, CSS vars, RSC) |
| 패키지 매니저 | **pnpm** |
| PWA 라이브러리 | **Serwist** (next-pwa 아님 — ADR-001 대상) |
| Supabase 클라이언트 | `@supabase/supabase-js` + `@supabase/ssr` |
| Supabase 프로젝트 | 이번 단계에선 만들지 않음. `.env.local.example`로 자리만 |

PRD가 후속 Phase에서 쓰겠다고 명시한 라이브러리(Zustand, Recharts, date-fns, React Hook Form, Zod, SheetJS)는 이번 단계에서 **설치하지 않는다**. 필요한 Phase에서 설치한다.

## 3. 폴더 구조 (최종 상태)

```
seungsoo-life/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                # 루트: /budget 으로 redirect
│   ├── sw.ts                   # Serwist 서비스 워커 엔트리
│   ├── budget/
│   │   └── page.tsx            # "가계부 (준비 중)"
│   ├── diary/
│   │   └── page.tsx            # "일기장 (준비 중)"
│   └── workout/
│       └── page.tsx            # "운동기록 (준비 중)"
├── components/
│   ├── common/
│   │   └── GlobalHeader.tsx
│   ├── budget/                 # 비어 있음 (Phase 4용 placeholder 디렉토리)
│   └── ui/                     # shadcn 컴포넌트 (이번 단계엔 button만)
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # 브라우저용 클라이언트 (createBrowserClient)
│   │   └── server.ts           # 서버 컴포넌트용 클라이언트 (createServerClient + cookies)
│   └── utils.ts                # shadcn cn() 헬퍼
├── public/
│   ├── manifest.json           # PWA manifest
│   └── icons/                  # 아이콘 placeholder (실제 디자인은 후속)
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-05-28-phase2-setup-design.md  # 이 문서
├── CLAUDE.md                   # 이미 존재
├── README.md
├── .env.local.example
├── .gitignore
├── next.config.mjs
├── postcss.config.mjs
├── tailwind.config.ts
├── components.json
├── tsconfig.json
├── package.json
└── pnpm-lock.yaml
```

## 4. 컴포넌트 단위 명세

각 단위는 **하나의 분명한 책임**을 가지며, 다른 단위에 대한 의존을 최소화한다.

### 4.1 `app/layout.tsx` (Root Layout)

- **책임**: HTML 셸 + 글로벌 헤더 마운트 + 전역 메타데이터 / PWA manifest 링크
- **의존**: `components/common/GlobalHeader`, `app/globals.css`
- **구조**:
  ```tsx
  <html lang="ko">
    <body>
      <GlobalHeader />
      <main className="...">{children}</main>
    </body>
  </html>
  ```
- **metadata export**: `title`, `description`, `manifest: '/manifest.json'`, `themeColor`

### 4.2 `app/page.tsx` (Root Page)

- **책임**: 루트 URL 접근 시 가계부 페이지로 보냄. CLAUDE.md의 "메인 자동 이동" 규칙을 통합 PWA 레벨에서 구현.
- **구현**: 서버 컴포넌트, `import { redirect } from 'next/navigation'; redirect('/budget');`

> 참고: 가계부 PRD의 "현재 년월 페이지로 자동 이동"은 **가계부 모듈 내부**의 동작이라 Phase 4에서 구현. 여기선 통합 앱의 진입점을 가계부로 잡는 것까지만 한다.

### 4.3 `app/budget/page.tsx`, `app/diary/page.tsx`, `app/workout/page.tsx`

- **책임**: 각 모듈의 placeholder. 모듈명 + "준비 중" 텍스트만 표시.
- **의존**: 없음 (가장 단순한 서버 컴포넌트)

### 4.4 `components/common/GlobalHeader.tsx`

- **책임**: 통합 PWA의 텍스트 메뉴 헤더. 활성 탭 시각 표시.
- **타입**: 클라이언트 컴포넌트 (`'use client'`)
- **의존**: `next/navigation`의 `usePathname`, `next/link`의 `Link`
- **인터페이스**: props 없음
- **동작**:
  - 메뉴 항목: `[{ label: '가계부', href: '/budget' }, { label: '일기장', href: '/diary' }, { label: '운동기록', href: '/workout' }]`
  - 현재 pathname이 `href`로 시작하면 활성. 활성 시 글자 굵게 + 밑줄.
  - 모바일 / 데스크탑 모두 같은 가로 텍스트 메뉴 (PRD: "텍스트만"). 햄버거 사이드바는 가계부 모듈 내부 사이드바용이라 Phase 4에서.

### 4.5 `lib/supabase/client.ts`

- **책임**: 브라우저에서 쓸 Supabase 클라이언트 생성.
- **구현**: `createBrowserClient` from `@supabase/ssr`. 환경변수 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 사용.
- **export**: `createClient(): SupabaseClient`

### 4.6 `lib/supabase/server.ts`

- **책임**: 서버 컴포넌트 / 라우트 핸들러에서 쓸 Supabase 클라이언트 생성.
- **구현**: `createServerClient` from `@supabase/ssr` + `cookies()` from `next/headers`.
- **export**: `async createClient()`

### 4.7 `lib/utils.ts`

- **책임**: shadcn 표준 `cn()` 헬퍼만. (다른 헬퍼는 필요할 때 추가)
- **구현**: `clsx` + `tailwind-merge`.

### 4.8 `app/sw.ts` (Serwist Service Worker)

- **책임**: PWA 오프라인 캐시 / 설치 가능성 엔진.
- **구현**: Serwist 표준 템플릿 — `defaultCache` 등록, `precacheEntries: self.__SW_MANIFEST`.

### 4.9 `next.config.mjs`

- **책임**: Next.js 설정 + Serwist withSerwist 래핑.
- **구현**: `withSerwist({ swSrc: 'app/sw.ts', swDest: 'public/sw.js' })`.

### 4.10 `public/manifest.json`

- **책임**: PWA 설치 메타데이터.
- **필드**: `name: "승수 라이프"`, `short_name: "승수라이프"`, `start_url: "/"`, `display: "standalone"`, `theme_color`, `background_color`, `icons` (placeholder 192/512).

### 4.11 `.env.local.example`

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### 4.12 `.gitignore`

표준 Next.js .gitignore + `.env.local` + Serwist 산출물(`public/sw.js`, `public/sw.js.map`, `public/swe-worker-*.js`).

### 4.13 `README.md`

- 프로젝트 소개 (한 단락)
- 기술 스택
- 셋업 방법 (`pnpm install` → `.env.local` 작성 → `pnpm dev`)
- 사용 가능한 스크립트 (`dev`, `build`, `start`, `lint`)
- Notion PRD 링크 2개
- 모듈 로드맵 (가계부 → 일기장 → 운동기록 → …)

## 5. 실행 순서 (10단계)

각 단계는 독립적으로 검증 가능하다. 실패 시 그 단계만 재시도.

1. `pnpm dlx create-next-app@14 .` (TypeScript / Tailwind / App Router / ESLint / no src / `@/*` alias)
2. `pnpm dlx shadcn@latest init` (neutral, CSS vars, RSC) → `pnpm dlx shadcn@latest add button`
3. `pnpm add @supabase/supabase-js @supabase/ssr`
4. `pnpm add @serwist/next serwist` + `next.config.mjs` 수정 + `app/sw.ts` 작성
5. 폴더 + placeholder 페이지 생성 (`app/budget`, `app/diary`, `app/workout`)
6. `components/common/GlobalHeader.tsx` 작성 + `app/layout.tsx`에 마운트
7. `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/utils.ts` 작성
8. `.env.local.example`, `public/manifest.json` 작성
9. `.gitignore` 보강 + `git init` + 첫 커밋
10. `README.md` 작성 → 2번째 커밋

## 6. 검증 (Phase 2 완료 조건)

- [ ] `pnpm install` 성공
- [ ] `pnpm dev` 실행 시 에러 없이 localhost에서 뜸
- [ ] 루트 URL 접속 시 `/budget`으로 자동 이동
- [ ] 헤더의 가계부 / 일기장 / 운동기록 클릭 시 각 placeholder로 이동
- [ ] 활성 탭이 시각적으로 구분됨 (굵게 + 밑줄)
- [ ] `pnpm build` 성공
- [ ] Chrome DevTools > Application에서 manifest와 service worker가 등록됨
- [ ] `git log`에 최소 1개 커밋 존재
- [ ] `.env.local`은 git에 포함되지 않음

## 7. ADR 알림 (세션 종료 시 사용자에게 보고)

CLAUDE.md의 "기술 스택 변경 = ADR 필수" 규칙에 따라 다음을 Notion 가계부 모듈 페이지 14번 섹션에 추가해야 한다:

```
ADR-001: PWA 라이브러리 Serwist 채택
- 일자: 2026-05-28
- 결정자: 승수 + Claude Code
- 결정: PWA 라이브러리로 Serwist 사용 (PRD에 적힌 "next-pwa 또는 Serwist" 중 Serwist 확정)
- 이유: next-pwa는 Next.js 14 App Router 공식 지원이 부재하고 유지보수가 정체. Serwist는 next-pwa 원작자의 후속 프로젝트로 App Router 호환성 및 유지보수 활발.
- 영향: package.json (deps), next.config.mjs (withSerwist 래핑), app/sw.ts (신규)
```

## 8. 의도적으로 안 하는 것 (YAGNI)

- ❌ Supabase 실제 프로젝트 생성 (Phase 3에서)
- ❌ Supabase Auth 페이지 (Phase 3)
- ❌ DB 스키마, RLS, 트리거 (Phase 3)
- ❌ PWA 아이콘 실제 디자인 (placeholder만, 실제 디자인은 MVP 직전)
- ❌ 가계부 실제 기능 — 인라인 테이블, 사이드바, 차트, 월별 페이지 (Phase 4)
- ❌ shadcn 컴포넌트 대량 추가 (button만; 나머지는 필요할 때)
- ❌ 후속 Phase 전용 라이브러리 (Zustand, Recharts, date-fns, RHF, Zod, SheetJS) 사전 설치
- ❌ 다크 모드 토글 (PRD 미명시)
- ❌ i18n (한국어 단일)
- ❌ 테스트 셋업 (Jest / Vitest / Playwright) — 가계부 핵심 로직(잔고 연쇄 갱신) 들어갈 때 도입 검토
