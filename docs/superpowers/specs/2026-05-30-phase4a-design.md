# Phase 4a — 인증 + 설정 UI 설계 (Design Spec)

> 일자: 2026-05-30
> 프로젝트: 승수 라이프 (통합 PWA) — 가계부 모듈
> 단계: Phase 4a (Google OAuth + 설정 3개 화면)
> 관련 PRD:
> - 마스터플랜: https://www.notion.so/35acf376124680498e8ecca4a28566f3
> - 가계부 모듈 PRD: https://www.notion.so/36dcf376124681d1aed1cc5f7212ab2f
> Phase 4 분할: 4a (이 문서) → 4b (거래 입력 + 월별 페이지 + 사이드바) → 4c (대시보드 차트)

---

## 1. 목적과 범위

Phase 4a의 단일 목표: **사용자가 로그인해서 가계부의 모든 시드 데이터(카테고리/결제수단/고정지출)를 입력할 수 있는 상태를 만든다.**

완료 시점: Google OAuth 로그인 작동 + 3개 설정 화면(`/budget/settings/{categories,payment-methods,fixed-expenses}`)에서 CRUD 가능 + 인증 미들웨어로 보호됨.

**브레인스토밍 결과 확정 사항** (2026-05-29):
- Phase 4 분할: 4a / 4b / 4c (셋)
- 4a 사이드바 미포함 (사이드바는 4b의 월별 일지 트리와 함께)
- 카테고리 UX: 트리 형태 (1차 펼치면 2차 들여쓰기, 한 페이지에 지출/수입 두 그룹 세로)
- 결제수단 UX: 인라인 리스트 (↑↓ 정렬, drag-and-drop 미포함)
- 고정지출 UX: 8컬럼 인라인 테이블 (CLAUDE.md "키보드 중심" 원칙)
- 데이터 패턴: Server Components(read) + Server Actions(write) + 일부 Client Components
- Server input validation: Zod (React Hook Form 안 씀)

**범위 안**: 인증 흐름, 3개 설정 화면, TypeScript 타입 생성, 인증 미들웨어, 글로벌 헤더 UserMenu 추가.

**범위 밖** (4b/4c/5+): 거래 입력, 월별 페이지, 사이드바, 차트, 엑셀 import, 시드 데이터 자동 입력.

## 2. 기술 스택 (4a에서 추가/사용)

| 항목 | 사용 |
|---|---|
| 인증 | Supabase Auth + Google OAuth (Phase 3에서 활성화됨) |
| Auth client | `@supabase/ssr` (Phase 2에서 설치, `lib/supabase/{client,server}.ts`에 wrapper) |
| 데이터 mutation | Next 14 Server Actions (`"use server"`) |
| Input validation | **Zod** (신규 의존성 — `pnpm add zod`) |
| Toast | **`sonner`** (신규 의존성 — `pnpm dlx shadcn@latest add sonner`) |
| Dropdown menu (UserMenu) | **shadcn `dropdown-menu`** (신규 — `pnpm dlx shadcn@latest add dropdown-menu`) |
| Modal (삭제 확인) | **shadcn `dialog`** (신규 — `pnpm dlx shadcn@latest add dialog`) |
| Toggle switch | **shadcn `switch`** (신규 — `pnpm dlx shadcn@latest add switch`) |
| Select dropdown | **shadcn `select`** (신규 — `pnpm dlx shadcn@latest add select`) |
| TypeScript types | Supabase MCP `generate_typescript_types` 산출물 → `lib/types/database.ts` |

## 3. 폴더 구조 (Phase 4a 종료 시점)

```
seungsoo-life/
├── app/
│   ├── signin/
│   │   └── page.tsx                                    ← 신규
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts                                ← 신규 (route handler)
│   ├── budget/
│   │   ├── page.tsx                                    (기존 placeholder 유지)
│   │   └── settings/
│   │       ├── layout.tsx                              ← 신규: sub-nav 공통 헤더
│   │       ├── categories/
│   │       │   └── page.tsx                            ← 신규
│   │       ├── payment-methods/
│   │       │   └── page.tsx                            ← 신규
│   │       └── fixed-expenses/
│   │           └── page.tsx                            ← 신규
│   └── layout.tsx                                      ← 수정: user fetch + Toaster
├── components/
│   ├── budget/
│   │   └── settings/
│   │       ├── CategoryTree.tsx                        ← 신규 (client)
│   │       ├── CategoryRowForm.tsx                     ← 신규 (client)
│   │       ├── PaymentMethodList.tsx                   ← 신규 (client)
│   │       ├── FixedExpenseTable.tsx                   ← 신규 (client)
│   │       ├── FixedExpenseRow.tsx                     ← 신규 (client)
│   │       ├── CategoryDropdowns.tsx                   ← 신규 (client, 4b 재사용)
│   │       ├── DeleteConfirmDialog.tsx                 ← 신규 (client, 3 화면 공용)
│   │       └── SettingsSubNav.tsx                      ← 신규 (client)
│   ├── common/
│   │   ├── GlobalHeader.tsx                            ← 수정: UserMenu 추가
│   │   └── UserMenu.tsx                                ← 신규 (client)
│   └── ui/                                             ← shadcn 추가분 (dropdown-menu, dialog, switch, select, sonner)
├── lib/
│   ├── actions/                                        ← 신규 디렉토리
│   │   ├── auth.ts                                     ← signOut server action
│   │   ├── categories.ts                               ← 4 server actions
│   │   ├── payment-methods.ts                          ← 4 server actions
│   │   └── fixed-expenses.ts                           ← 3 server actions
│   ├── types/
│   │   └── database.ts                                 ← 신규 (Supabase MCP 생성)
│   ├── validators/
│   │   ├── categories.ts                               ← Zod schemas
│   │   ├── payment-methods.ts                          ← Zod schemas
│   │   └── fixed-expenses.ts                           ← Zod schemas
│   └── supabase/                                       (기존 그대로)
└── middleware.ts                                       ← 신규 (프로젝트 루트)
```

총 신규 파일: 약 21개 (3 page + 1 layout + 1 route + 11 component + 1 type + 3 validator + 1 middleware + UserMenu + auth action).

## 4. 인증 흐름 명세

### 4.1 Sign-in 흐름

```
1. 미인증 사용자가 /budget/* 접근
2. middleware.ts 인터셉트 → /signin?next=<원래경로> redirect
3. /signin: "Google로 로그인" 버튼 1개
4. 클릭 → supabase.auth.signInWithOAuth({
     provider: 'google',
     options: { redirectTo: `${location.origin}/auth/callback?next=${searchParams.get('next') ?? '/budget'}` }
   })
5. Google OAuth consent → 사용자 동의
6. Google → https://iwrcprtjyxzfsriiupsw.supabase.co/auth/v1/callback redirect
7. Supabase → /auth/callback?code=xxx&next=<...> 로 redirect
8. app/auth/callback/route.ts:
   - code → session 교환 (supabase.auth.exchangeCodeForSession)
   - cookies에 session 저장 (@supabase/ssr 자동 처리)
   - next 파라미터로 redirect (없으면 /budget)
9. 사용자 원하던 페이지 진입 (middleware 통과)
10. handle_new_user 트리거가 첫 로그인이면 profiles row 자동 생성 (Phase 3 완성)
```

### 4.2 Sign-out 흐름

```
1. 글로벌 헤더 우상단 UserMenu → "로그아웃" 클릭
2. Server Action signOut() → supabase.auth.signOut() → revalidatePath('/')
3. cookies 제거 → /signin으로 redirect
```

### 4.3 컴포넌트 명세

**`app/signin/page.tsx`** (`'use client'`)
- 중앙 카드 1개: 제목 "승수 라이프" + Google 로그인 버튼 (shadcn Button)
- 이미 로그인 상태면 client-side redirect to `/budget`
- 버튼 클릭 → `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: ... } })`
- 로딩 상태 (버튼 disabled) + 에러 메시지 (Toast)

**`app/auth/callback/route.ts`** (server route handler)
- GET request 처리
- `searchParams.get('code')`, `searchParams.get('next')` 추출
- code 없으면 `/signin?error=missing_code` redirect
- supabase server client → `exchangeCodeForSession(code)`
- 성공: `next || '/budget'`로 redirect
- 실패: `/signin?error=${error.message}` redirect

**`middleware.ts`** (프로젝트 루트)
- `@supabase/ssr`의 `createServerClient` + middleware pattern
- 모든 request에서 session 갱신 (refresh token 자동)
- 매칭 경로: `/budget/:path*`
- session 없으면 → `/signin?next=<원래경로>` redirect
- `/signin`에서 session 있으면 → `/budget` redirect
- `/`, `/diary`, `/workout`는 인증 안 함

**`components/common/UserMenu.tsx`** (`'use client'`)
- props: `{ email: string }`
- shadcn `DropdownMenu` 사용
- 트리거: 이메일 첫 2글자 둥근 아바타 (CSS만, 이미지 X)
- 드롭다운 항목:
  - 이메일 표시 (read-only, dim text)
  - 구분선
  - "로그아웃" (form action with signOut server action)

**`app/layout.tsx` 수정**
- Server Component로 `await supabase.auth.getUser()` → user 정보 fetch
- `<GlobalHeader user={user ? { email: user.email } : null} />` props 전달
- `<Toaster />` 추가 (sonner)

**`components/common/GlobalHeader.tsx` 수정**
- 기존 nav (가계부/일기장/운동기록) 그대로
- 우측에 `{user ? <UserMenu email={user.email} /> : null}` 추가
- props type 추가: `{ user: { email: string } | null }`

**`lib/actions/auth.ts`**
```ts
"use server"
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/')
  redirect('/signin')
}
```

## 5. 설정 화면 명세

### 5.1 공통: `app/budget/settings/layout.tsx`

3개 설정 페이지의 공통 레이아웃. sub-nav 헤더 표시.

```
┌──────────────────────────────────────────┐
│ ← 가계부로 돌아가기                       │
│                                          │
│ ⚙️ 설정                                  │
│                                          │
│ [카테고리] [결제수단] [고정지출]          │
│ ──────────────────────────────────────  │
│                                          │
│ {children}                               │
└──────────────────────────────────────────┘
```

`SettingsSubNav.tsx` (client component, usePathname으로 활성 탭 표시).

### 5.2 카테고리 (`/budget/settings/categories`)

**서버 컴포넌트** (`page.tsx`): `select * from categories order by type, parent_id nulls first, sort_order, created_at` → 클라이언트에 props 전달.

**클라이언트 컴포넌트** (`CategoryTree.tsx`):
- 받은 데이터를 두 그룹(`expense`, `income`)으로 분리
- 각 그룹: 헤더 ("💸 지출 카테고리" / "💰 수입 카테고리") + "+ 1차 카테고리 추가" 버튼 + 1차들의 트리
- 각 1차: ▶/▼ 토글 (client useState), 이름, 편집/삭제 버튼, 2차 개수 `(N)` 표시
- 펼친 1차 아래에 2차들 들여쓰기 + "+ 하위 카테고리 추가" 버튼

**`CategoryRowForm.tsx`** (한 행의 view/edit + add 인라인 form):
- props: `{ category?: Category; parentId?: string; type: 'income'|'expense'; onSave: () => void }`
- 모드: `view` (이름 + 편집/삭제 버튼) / `edit` (input + 저장/취소) / `add` (input + 추가/취소)
- 키보드: Enter=save, Esc=cancel, blur=save

**삭제 흐름**:
- 🗑️ 클릭 → `DeleteConfirmDialog` 열림
- 1차 삭제 시 안내: "하위 카테고리 N개도 함께 삭제됩니다. 과거 거래의 텍스트는 그대로 유지됩니다."
- 2차 삭제 시 안내: "과거 거래의 텍스트는 그대로 유지됩니다."

**type 변경 불가**: 1차/2차 모두 type은 생성 시점에 결정. 편집 시 이름만 수정 가능.

**2차 추가 시 type = parent.type 자동 상속**: 별도 선택 UI 없음.

### 5.3 결제수단 (`/budget/settings/payment-methods`)

**서버 컴포넌트**: `select * from payment_methods order by sort_order, created_at` → props.

**클라이언트 컴포넌트** (`PaymentMethodList.tsx`):
- 컬럼: 순서(↑↓ 버튼), 이름, 활성(toggle), 편집/삭제
- "+ 추가" → 인라인 입력 행 (이름만) → Enter → `sort_order = max+1, active = true`
- ↑ 버튼: 이전 행과 sort_order swap (`movePaymentMethod({ id, direction: 'up' })`)
- ↓ 버튼: 다음 행과 sort_order swap
- 첫 행의 ↑, 마지막 행의 ↓는 disabled
- 비활성(active=false) 행은 dim 표시. **숨기지 않음** (사용자가 다시 활성화 가능)

### 5.4 고정지출 (`/budget/settings/fixed-expenses`)

**서버 컴포넌트**: 3개 쿼리 병렬
- `select * from fixed_expenses order by created_at`
- `select * from categories order by type, parent_id, sort_order`
- `select * from payment_methods where active = true order by sort_order`
→ props로 모두 전달.

**클라이언트 컴포넌트** (`FixedExpenseTable.tsx`):
- 8컬럼 테이블: 활성(toggle), 일(1-31), 종류(income/expense select), 1차(select), 2차(select), 결제수단(select), 설명(text), 금액(number)
- 우측 끝에 삭제 버튼
- 하단 "+ 새 행" 버튼 → 빈 행 추가 (모든 필드 비어있음 — 저장은 모든 필수 필드 채워야 가능)
- 각 셀 인라인 편집:
  - Tab → 다음 셀 / Shift+Tab → 이전 셀
  - Enter (마지막 셀) → 새 행 생성 + focus 이동
  - Esc → 변경 취소
  - blur → 자동 save (모든 필수 필드 채워졌으면 `updateFixedExpense`, 아니면 dirty 상태 유지)

**`FixedExpenseRow.tsx`** (한 행의 모든 셀 편집 로직):
- props: `{ row: FixedExpense | NewRow; categories: Category[]; paymentMethods: PaymentMethod[]; onSave; onDelete }`
- 새 행은 `id`가 임시 (예: `temp-<random>`) — save 성공 시 서버 id로 교체

**`CategoryDropdowns.tsx`** (재사용 컴포넌트, 4b 거래 입력에서도 사용):
- props: `{ categories: Category[]; type: 'income'|'expense'; value1st?: string; value2nd?: string; onChange: (next: { '1st'?: string; '2nd'?: string }) => void }`
- 1차 select: type으로 필터링된 카테고리들 (parent_id = null)
- 2차 select: 1차 선택된 경우 그 1차의 자식들만 표시, 안 선택이면 disabled
- 1차 변경 시 2차 자동 초기화

**결제수단 드롭다운**:
- props로 받은 `paymentMethods` (이미 active=true 필터링됨)
- 수입 행에서도 빈값 OK (월급 같은 거)

**일(day_of_month) 입력**: number input, min=1 max=31. 29-31의 월말 조정은 4b의 "다음 월 생성" 로직 영역 — 4a는 input만.

## 6. Server Actions 명세

모든 Server Action은 다음 공통 패턴 따름:

```ts
"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { <Schema> } from "@/lib/validators/<resource>"

export async function <verb><Resource>(input: <InputType>): Promise<{ ok: boolean; error?: string }> {
  const parsed = <Schema>.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값 오류' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: '로그인 필요' }

  const { error } = await supabase.from('<table>').<op>(...)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/budget/settings/<resource>')
  return { ok: true }
}
```

### 6.1 `lib/actions/categories.ts`

```ts
addCategory(input: { name: string; type: 'income'|'expense'; parent_id: string | null }): Promise<{ ok; error? }>
updateCategory(input: { id: string; name: string }): Promise<{ ok; error? }>
deleteCategory(input: { id: string }): Promise<{ ok; error? }>
reorderCategories(input: { ids: string[]; type: 'income'|'expense'; parent_id: string | null }): Promise<{ ok; error? }>
  // reorderCategories는 정의만, UI는 4a에 없음 (sort_order 자동 = max+1)
```

### 6.2 `lib/actions/payment-methods.ts`

```ts
addPaymentMethod(input: { name: string }): Promise<{ ok; error? }>
updatePaymentMethod(input: { id: string; name?: string; active?: boolean }): Promise<{ ok; error? }>
deletePaymentMethod(input: { id: string }): Promise<{ ok; error? }>
movePaymentMethod(input: { id: string; direction: 'up'|'down' }): Promise<{ ok; error? }>
  // movePaymentMethod 내부: 트랜잭션으로 두 행 sort_order swap
```

### 6.3 `lib/actions/fixed-expenses.ts`

```ts
addFixedExpense(input: {
  day_of_month: number;
  type: 'income'|'expense';
  category_1st: string;
  category_2nd?: string;
  payment_method?: string;
  description?: string;
  amount: number;
}): Promise<{ ok; error? }>

updateFixedExpense(input: { id: string; [field: string]: any }): Promise<{ ok; error? }>
  // 부분 update 허용 (active toggle만 또는 amount만 등)

deleteFixedExpense(input: { id: string }): Promise<{ ok; error? }>
```

### 6.4 `lib/actions/auth.ts`

```ts
signOut(): Promise<void>
  // supabase.auth.signOut() → revalidatePath('/') → redirect('/signin')
```

### 6.5 Zod 스키마 (`lib/validators/`)

```ts
// categories.ts
AddCategorySchema = z.object({
  name: z.string().min(1, '이름은 필수').max(60, '이름은 60자 이내'),
  type: z.enum(['income', 'expense']),
  parent_id: z.string().uuid().nullable(),
})
UpdateCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(60),
})

// payment-methods.ts
AddPaymentMethodSchema = z.object({
  name: z.string().min(1).max(60),
})
UpdatePaymentMethodSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(60).optional(),
  active: z.boolean().optional(),
})

// fixed-expenses.ts
AddFixedExpenseSchema = z.object({
  day_of_month: z.number().int().min(1).max(31),
  type: z.enum(['income', 'expense']),
  category_1st: z.string().min(1),
  category_2nd: z.string().optional(),
  payment_method: z.string().optional(),
  description: z.string().max(200).optional(),
  amount: z.number().positive('금액은 양수'),
})
UpdateFixedExpenseSchema = AddFixedExpenseSchema.partial().extend({
  id: z.string().uuid(),
  active: z.boolean().optional(),
})
```

## 7. 검증 게이트 (Phase 4a 완료 조건)

### 게이트 A — 인증 흐름

- 로그아웃 상태에서 `/budget/settings/categories` 접근 → `/signin?next=/budget/settings/categories` redirect
- `/signin`에서 Google 버튼 클릭 → Google consent → callback → 원래 페이지(`/budget/settings/categories`) 도달
- 글로벌 헤더 우상단에 이메일 첫 2글자 아바타 + UserMenu 표시
- UserMenu → "로그아웃" 클릭 → `/signin` redirect, 헤더에서 UserMenu 사라짐
- `/`, `/diary`, `/workout`는 미인증 상태에서도 접근 가능

### 게이트 B — 카테고리 CRUD

- 지출 1차 "식비" 추가 → 트리에 표시
- "식비" 펼치고 2차 "배달식사" 추가 → 들여쓰기로 표시
- "배달식사" 이름 → "배달"로 편집 → 즉시 반영
- "식비" 삭제 → 모달에 "하위 1개도 함께 삭제" 안내 → 확인 → 사라짐
- 새로고침 후에도 변경 유지
- (Supabase 대시보드에서 별도 user로 SELECT → 빈 결과 = RLS 격리 검증)

### 게이트 C — 결제수단 CRUD

- "보라삼성" 추가 → 리스트 1행
- "삼성", "신한" 순서대로 추가 → 3행
- "삼성"의 ↓ 클릭 → "보라삼성", "신한", "삼성" 순서
- "삼성" 활성 toggle off → dim 표시
- 새로고침 후에도 유지

### 게이트 D — 고정지출 인라인 테이블

- "+ 새 행" → 빈 행 추가
- 일=25, 종류=출금, 1차=주거, 2차=월세, 결제수단=보라삼성, 설명="서대문 빌라", 금액=650000 입력 (Tab으로 셀 이동)
- blur 또는 Enter → 저장 → 행 유지
- 1차 변경 시 2차 자동 초기화 (예: 주거 → 식비)
- 활성 toggle → 표시 변화 (active=false면 dim)
- 행 삭제 → 사라짐
- 새로고침 후에도 유지

### 게이트 E — 빌드/타입체크/린트

- `pnpm build` 통과 (모든 라우트 빌드)
- `pnpm exec tsc --noEmit` 통과 (`database.ts` 타입 충돌 없음)
- `pnpm lint` 통과
- git working tree clean

다섯 게이트 모두 통과 → Phase 4a 완료 → Phase 4b 진입.

## 8. ADR 알림 (Phase 4a 종료 시 사용자에게 보고할 내용)

CLAUDE.md의 "기술 스택 변경 = ADR 필수" 규칙 적용 항목:

```
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

## 9. Phase 4a 완료 정의 (Definition of Done)

- [ ] `lib/types/database.ts` 생성 (Supabase MCP `generate_typescript_types`)
- [ ] 새 의존성 설치: `zod`, shadcn 4종(`dropdown-menu`, `dialog`, `switch`, `select`, `sonner`)
- [ ] `app/signin/page.tsx` + `app/auth/callback/route.ts` 작동
- [ ] `middleware.ts` 작성 (`/budget/*` 보호)
- [ ] `components/common/UserMenu.tsx` + `GlobalHeader.tsx` 수정
- [ ] `app/layout.tsx` 수정 (user fetch + Toaster)
- [ ] `app/budget/settings/layout.tsx` + `SettingsSubNav.tsx`
- [ ] 3개 설정 페이지 (`categories`, `payment-methods`, `fixed-expenses`) 완성
- [ ] 9개 클라이언트 컴포넌트 (CategoryTree, CategoryRowForm, PaymentMethodList, FixedExpenseTable, FixedExpenseRow, CategoryDropdowns, DeleteConfirmDialog, SettingsSubNav, UserMenu)
- [ ] `lib/actions/` 4개 파일 (auth + 3 resources)
- [ ] `lib/validators/` 3개 파일 (Zod schemas)
- [ ] 5개 검증 게이트 (A-E) 통과
- [ ] git working tree clean
- [ ] ADR-008/009/010 사용자에게 보고

## 10. 의도적으로 안 하는 것 (YAGNI / 후속 Phase)

- ❌ 거래 입력 화면 (인라인 테이블) — Phase 4b
- ❌ 월별 페이지 + 다음 월 생성 버튼 — Phase 4b
- ❌ 좌측 사이드바 (월별 일지 트리 + 설정 메뉴) — Phase 4b
- ❌ 대시보드 차트 — Phase 4c
- ❌ 5년치 엑셀 import — Phase 5+
- ❌ 시드 데이터 자동 입력 — 사용자가 4a 완료 후 수동 입력 (반나절)
- ❌ Drag-and-drop 정렬 — ADR-010
- ❌ React Hook Form — ADR-009
- ❌ Realtime subscriptions — 1인용 불필요
- ❌ Optimistic UI (`useOptimistic`) — Server Actions revalidate로 충분
- ❌ Sentry / 에러 트래킹 — MVP 후
- ❌ Skeleton / Loading state 풍부한 시스템 — Suspense 기본 + MVP 후 다듬기
- ❌ 카테고리 색상/아이콘 — UI 단순화
- ❌ 카테고리 가져오기/내보내기 — Phase 5 영역
- ❌ 다중 OAuth provider (Apple, Email) — 1인용 불필요
- ❌ 비밀번호 재설정 — Google이 처리
- ❌ 이메일 인증 단계 — Google이 이미 인증된 이메일 제공
- ❌ Remember me — Supabase 기본 session 유지 (refresh token)
- ❌ i18n (한국어 단일)
