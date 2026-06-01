# 모바일 반응형 재설계 (Phase 4b-3) Design Spec

**Date:** 2026-06-01
**Status:** Approved (design Q&A completed)
**Scope:** `/budget/[ym]` (메인 월 페이지) + `/budget/settings/fixed_expenses`

---

## 1. 문제 정의

### 1.1 현재 상태

`/budget/[ym]` 페이지는 iPhone (430px viewport) 에서 가로 오버플로우 발생:

- **거래 테이블**: `grid-cols-[1fr_1fr_45px_100px_1fr_120px_70px_30px]` — 고정폭 합산 365px + gap·padding + 3×`1fr` 최소폭 → 페이지 최소 너비 ~560px
- 페이지가 가로로 늘어나면서 **요약카드 7개 (2-col grid)** 도 함께 오른쪽으로 잘림 (`₩4,500,000` 우측 부분 끊김)
- 페이지 패딩 `p-6` (좌우 24px씩, 합 48px) — 모바일 가용 공간 추가 잠식

`/budget/settings/fixed_expenses` 도 유사 — `grid-cols-[70px_60px_80px_1fr_1fr_120px_1fr_120px_40px]` 9컬럼 (고정폭 합 490px+) 동일 오버플로우.

### 1.2 헤더는 정상

`components/common/GlobalHeader.tsx` — `grid-cols-[1fr_auto_1fr]` + `max-w-5xl` + `px-4` 패턴으로 모바일 호환 OK. **변경 없음**.

### 1.3 사용 맥락

- 사용자는 iPhone PWA로 일상적으로 가계부 확인 (주 사용 디바이스)
- 데스크탑은 일괄 입력·편집용
- 모바일 주 사용 케이스: 잔고 확인 + 단건 거래 추가 + 결제완료 토글

---

## 2. 설계 결정

### 2.1 Responsive 분기 전략 (ADR-020)

같은 페이지 안에 모바일/데스크탑 트리를 **둘 다 SSR 렌더링**, CSS로 한쪽만 표시:

```tsx
<div className="md:hidden"> {/* Mobile tree */} </div>
<div className="hidden md:block"> {/* Desktop tree */} </div>
```

**Why**: JS 분기 (useMediaQuery + 조건부 렌더링) 보다 SSR/hydration 안전. Tailwind 표준 패턴.

### 2.2 Breakpoint (ADR-017)

**Tailwind `md` (768px)** 사용:

| Viewport | 분류 | 레이아웃 |
|---|---|---|
| `< 768px` | Mobile | Card stack + Bottom sheet |
| `>= 768px` | Desktop / iPad mini landscape+ | 현재 8컬럼 테이블 유지 |

### 2.3 모바일 거래 UI (ADR-016)

- 각 거래 = **카드 1장 (읽기 전용)** — 카테고리/일/결제수단/비고/금액 표시
- 카드 내 **결제완료 pill 1-tap** = `toggleIsPaid` 즉시 호출 (시트 안 거침)
- 카드 본문 어디든 **탭 → 하단 시트 슬라이드업** = 전체 필드 편집
- "+ 거래 추가" 버튼 → 빈 시트 (모드 = "add")

PRD §3 "모바일: 세로 배치, 일부 컬럼 접기" 방향과 일치.

### 2.4 모바일 요약카드 (ADR-018)

```
┌──────────────────────────────┐
│ 예상 잔고                    │  ← Hero (전체폭, 강조)
│ ₩2,128,929                   │
└──────────────────────────────┘
┌──────────────┐┌──────────────┐
│전월 잔고     ││입금 총액     │
│₩9,043       ││₩4,500,000   │
└──────────────┘└──────────────┘
┌──────────────┐┌──────────────┐
│출금 총액     ││실제 출금     │
└──────────────┘└──────────────┘
┌──────────────┐┌──────────────┐
│남은 출금     ││현재 잔고     │
└──────────────┘└──────────────┘
```

- 7개 카드 중 **예상 잔고**만 Hero (가장 중요한 단일 수치)
- 나머지 6개는 2-col grid
- 데스크탑(md+)은 현재 7-col 한 줄 유지

### 2.5 Bottom sheet 라이브러리 (ADR-019)

**`vaul`** 도입 (`pnpm add vaul`):

- ~18KB gzipped
- iOS-feel drag handle, snap points, drag-to-dismiss 내장
- base-ui Dialog 자체 구현보다 코드 적음
- TypeScript 타입 내장, shadcn/ui 호환

---

## 3. 컴포넌트 구조

### 3.1 신규 — 메인 페이지

| 컴포넌트 | 책임 | 위치 |
|---|---|---|
| `TransactionCardMobile` | 거래 1개 카드 (display + is_paid 1-tap) | `components/budget/month/TransactionCardMobile.tsx` |
| `TransactionCardList` | 카드 리스트 + AddButton + editingId 상태 | `components/budget/month/TransactionCardList.tsx` |
| `TransactionEditSheet` | vaul Drawer 래퍼, 폼 (edit/add 모드) | `components/budget/month/TransactionEditSheet.tsx` |

### 3.2 신규 — 고정지출 설정

| 컴포넌트 | 책임 | 위치 |
|---|---|---|
| `FixedExpenseCardMobile` | 고정지출 1개 카드 (display + active 1-tap) | `components/budget/settings/FixedExpenseCardMobile.tsx` |
| `FixedExpenseCardList` | 카드 리스트 + AddButton + editingId | `components/budget/settings/FixedExpenseCardList.tsx` |
| `FixedExpenseEditSheet` | vaul Drawer 래퍼, 폼 | `components/budget/settings/FixedExpenseEditSheet.tsx` |

### 3.3 수정 — 기존

| 파일 | 변경 |
|---|---|
| `components/budget/month/MonthlySummary.tsx` | Hero(예상잔고) + 2col 6개 (`md:hidden`) / 7col (`hidden md:grid`) 두 트리 동시 렌더 |
| `components/budget/month/SummaryCard.tsx` | `hero?: boolean` prop 추가 — 활성 시 `p-4 text-base font-semibold` |
| `components/budget/month/TransactionGroups.tsx` | desktop=TransactionTable, mobile=TransactionCardList 동시 렌더 |
| `components/budget/settings/FixedExpenseTable.tsx` | `hidden md:block`로 감쌈 |
| `app/budget/[ym]/page.tsx` | `p-3 md:p-6`, `space-y-4 md:space-y-6`, `text-xl md:text-2xl` |
| `app/budget/settings/fixed_expenses/page.tsx` | 동일 패턴 |

**변경 없음**: `TransactionTable.tsx`, `TransactionRow.tsx`, `TransactionAddRow.tsx`, `FixedExpenseRow.tsx` — 데스크탑 전용으로 격리

### 3.4 의존성

- 추가: `vaul@^1.x` (pnpm 패키지)
- 제거: 없음
- 서버액션 신규: 없음 (기존 `addTransaction` / `updateTransaction` / `deleteTransaction` / `toggleIsPaid` / `addFixedExpense` / `updateFixedExpense` / `deleteFixedExpense` 재사용)

---

## 4. Data Flow

### 4.1 State 위치

`TransactionCardList` 가 `editingId: string | "new" | null` 보유:

- `null` → sheet 닫힘
- `"new"` → sheet 열림 (Add 모드, initial=null)
- `"<uuid>"` → sheet 열림 (Edit 모드, initial=transactions.find(t=>t.id===editingId))

### 4.2 Sheet → Server Action

| 액션 | 호출 | 성공 처리 |
|---|---|---|
| 저장 (add) | `addTransaction(form)` | 서버 액션 내부 `revalidatePath` → 부모 `setEditingId(null)` |
| 저장 (edit) | `updateTransaction({id, ...form})` | 동일 |
| 삭제 | `deleteTransaction({id})` | 동일 (확인 다이얼로그 후) |
| 닫기/스와이프 다운 | — | silent discard, `setEditingId(null)` |

### 4.3 카드 내 1-tap 토글

`is_paid` (거래 카드) / `active` (고정지출 카드) — sheet 안 거치고 직접:

```tsx
<button
  onClick={(e) => {
    e.stopPropagation()  // 카드 본문 탭(시트 열기) 차단
    toggleIsPaid({ id, is_paid: !current })
  }}
>
```

### 4.4 폼 검증

기존 Zod 스키마 재사용:
- `AddTransactionSchema` / `UpdateTransactionSchema` (`lib/validators/transactions.ts`)
- `AddFixedExpenseSchema` / `UpdateFixedExpenseSchema` (`lib/validators/fixed-expenses.ts`)

폼 관리: `useState` (기존 TransactionRow 패턴 일치 — RHF 도입 안 함).

### 4.5 정렬

`sortTransactionsInGroup` (`lib/utils/transactions-sort.ts`) 그대로 사용. 카드 스택 렌더 전에 정렬 적용.

---

## 5. Card 디자인 디테일

### 5.1 `TransactionCardMobile` 시각 규칙

| 의미 | 표현 |
|---|---|
| 기본 카드 | `border border-neutral-200 bg-white rounded px-3 py-2.5` |
| 고정지출 | `border-l-4 border-l-blue-500 bg-blue-50/30` (데스크탑과 일관) |
| 출금 미결제 | `ring-1 ring-amber-200` (살짝 노란 외곽선) |
| 수입 금액 | `text-emerald-600 font-semibold` |
| 출금 금액 | `text-neutral-900 font-semibold` |
| 결제완료 pill | `bg-emerald-500 text-white "✓ 완료"` |
| 미결제 pill | `bg-neutral-200 "대기"` |

### 5.2 카드 내부 3행

```
Row 1: 1차 ▸ 2차 (truncate)              일{day}
Row 2: 결제수단 · 비고 (truncate, text-xs)
Row 3: ₩금액 (text-base)         [결제 pill]
```

### 5.3 탭 영역

카드 전체에 `<button className="absolute inset-0">` 깔아서 어디든 탭 → 시트. 결제 pill에 `stopPropagation` 으로 시트 차단.

### 5.4 `FixedExpenseCardMobile` 차이

- 결제 pill 자리에 **활성 pill** (`✓ 활성` / `비활성`)
- 일자 표시: `매월 {day}일` (반복 의미 강조), `day=0` 이면 `날짜 미정` 라벨
- 금액 `0` 이면 `—` 표시

### 5.5 AddButton

```tsx
<button className="w-full rounded border-2 border-dashed border-neutral-300 py-3 text-sm text-neutral-600">
  + 거래 추가
</button>
```

### 5.6 Touch target (iOS HIG)

- 카드 최소 높이: `min-h-[88px]`
- pill 버튼: `px-3 py-2` (확대)
- 시트 내 input: `h-11 text-base` (44px 높이, 16px 폰트 — iOS Safari zoom-in 방지)

---

## 6. 시트 폼 레이아웃

```tsx
<form className="space-y-3 px-4 pb-4">
  <Select label="1차 카테고리" className="h-11 text-base" />
  <Select label="2차 카테고리" className="h-11 text-base" />
  <div className="grid grid-cols-2 gap-3">
    <input type="number" label="일" className="h-11 text-base" />
    <Select label="결제수단" className="h-11 text-base" />
  </div>
  <input type="text" label="비고" className="h-11 text-base" />
  <input type="text" inputMode="numeric" label="금액"
         value={formatted_with_commas} className="h-11 text-right text-base" />
  <PillToggle label="결제완료" />
  <div className="flex gap-2 pt-2">
    <Button variant="ghost" className="flex-1" onClick={onClose}>닫기</Button>
    {mode === "edit" && <Button variant="destructive">삭제</Button>}
    <Button className="flex-1" onClick={save}>저장</Button>
  </div>
</form>
```

- `max-w-md mx-auto` — 태블릿/landscape에서 폼 너비 제한
- `max-h-[85vh] overflow-y-auto` — 키보드 올라와도 스크롤 가능

---

## 7. 페이지 레벨 변경

### 7.1 `/budget/[ym]/page.tsx`

```tsx
// Before
<div className="space-y-6 p-6">
  <h1 className="text-2xl font-bold">{formatYmKorean(params.ym)}</h1>

// After
<div className="space-y-4 p-3 md:space-y-6 md:p-6">
  <h1 className="text-xl font-bold md:text-2xl">{formatYmKorean(params.ym)}</h1>
```

### 7.2 `/budget/settings/fixed_expenses/page.tsx`

동일 패턴 (페이지 padding/spacing/heading).

### 7.3 글로벌 헤더 / 사이드바

**변경 없음**. `GlobalHeader` 는 이미 호환. `Sidebar` 도 햄버거 메뉴 + 슬라이드아웃 패턴으로 모바일 대응 완료 상태.

---

## 8. 회귀 위험 + 영향 없는 영역

| 영역 | 위험 평가 |
|---|---|
| Phase 3 잔고 트리거 (`trg_transactions_recalc`) | 영향 없음 — UI만 변경 |
| 스냅샷 패턴 (CLAUDE.md §1) | 영향 없음 — 시트 폼도 텍스트 값 그대로 저장 |
| createNextMonth 자동 INSERT | 영향 없음 |
| Sort 규칙 (PRD §6) | 동일 함수 사용, 렌더만 카드/테이블 분기 |
| 데스크탑 8col 테이블 | `hidden md:block` 로 격리, 코드 변경 없음 → 회귀 거의 없음 |
| RLS / 인증 | 영향 없음 |

---

## 9. 테스트 게이트 (Manual)

### Gate A: Build + Type
- [ ] `pnpm run build` 통과
- [ ] `pnpm exec tsc --noEmit` 0 error
- [ ] `pnpm exec eslint .` 0 error

### Gate B: 모바일 시각 (Chrome devtools iPhone 14 Pro Max 430×932)
- [ ] 페이지 가로 스크롤 없음 — 모든 콘텐츠 430px 내부
- [ ] 7개 요약카드 모두 보임: Hero(예상잔고) + 2col 6개
- [ ] 카드 값 잘림 없음 (`₩4,500,000` 풀 표시)
- [ ] 고정지출 카드 좌측 파란 보더 보임
- [ ] 출금/입금 두 섹션 세로 배치
- [ ] "+ 거래 추가" 버튼 보임

### Gate C: 모바일 인터랙션 (메인 페이지)
- [ ] 카드 본문 탭 → 시트 슬라이드업
- [ ] 시트 안 폼 수정 → 저장 → 시트 닫힘 → 카드 갱신, 요약카드 재계산
- [ ] 결제완료 pill 1-tap → 시트 안 열리고 즉시 토글, 요약카드 재계산
- [ ] 시트 위로 스와이프 → 풀스크린, 아래로 → 닫힘 (discard)
- [ ] "+ 거래 추가" → 빈 시트 → 저장 → 새 카드 추가
- [ ] 시트 내 삭제 → 확인 → 카드 제거, 요약카드 재계산

### Gate D: 데스크탑 회귀 (md+ viewport)
- [ ] 8col 인라인 테이블 그대로 보임 (변경 없어야 함)
- [ ] 요약카드 한 줄 7개 (`grid-cols-7`)
- [ ] 인라인 편집 동작 그대로
- [ ] FixedExpense 페이지도 동일 회귀

### Gate E: 고정지출 설정 모바일
- [ ] 9col grid 안 보임, 카드 스택 보임
- [ ] 카드 탭 → 시트 (active 토글 포함)
- [ ] 일=0, 금액=0 허용 그대로 (Zod 변경 없음)
- [ ] "+ 고정지출 추가" → 시트 → 저장 → 카드 추가
- [ ] 활성 pill 1-tap 토글

---

## 10. ADR (Notion 업데이트 필요)

| ID | 결정 | 이유 |
|---|---|---|
| **ADR-016** | 모바일 거래 UI = Card stack + Bottom sheet | 430px viewport에서 8col 테이블 오버플로우. PRD §3 방향 |
| **ADR-017** | Breakpoint = Tailwind `md` (768px) | iPhone 모든 모델 = 모바일, iPad mini landscape+ = 데스크탑 |
| **ADR-018** | MonthlySummary 모바일 = Hero (예상잔고) + 6card 2col | 가장 중요한 수치 우선 강조 |
| **ADR-019** | vaul 라이브러리 도입 (bottom sheet) | base-ui 자체 구현보다 검증된 iOS-feel 패턴 + 드래그 |
| **ADR-020** | 모바일/데스크탑 = 동시 SSR + CSS 분기 | JS 분기보다 SSR/hydration 안전 |

---

## 11. 작업 분해 (Plan 단위 미리보기)

1. `pnpm add vaul` + vaul Drawer 검증용 mini sandbox 라우트
2. `SummaryCard` 에 `hero` prop 추가 + `MonthlySummary` 모바일/데스크탑 분기
3. `TransactionCardMobile` (display only + is_paid pill)
4. `TransactionEditSheet` (vaul Drawer + 폼)
5. `TransactionCardList` (state + cards + AddButton + sheet 연결)
6. `TransactionGroups` 분기 + page padding/typography 수정
7. `FixedExpenseCardMobile` / `FixedExpenseEditSheet` / `FixedExpenseCardList`
8. FixedExpense settings 페이지 분기
9. Manual gates A~E 실행
10. 커밋 + Notion ADR 알림

상세 step-by-step plan은 `docs/superpowers/plans/2026-06-01-mobile-responsive.md` 에 별도 작성.
