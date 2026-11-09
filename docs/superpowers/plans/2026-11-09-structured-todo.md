# 구조화된 할 일/위시리스트 (diary_todo_items) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/diary/notes` 페이지를 마크다운 블록 방식(`diary_notes`)에서 항목(row) 단위 구조화 할 일 리스트(`diary_todo_items`)로 교체하고, 헤더 메뉴에 "To Do"를 추가한다.

**Architecture:** 가계부 모듈의 기존 패턴(서버 액션 + `use client` 인라인 편집 컴포넌트 + 연속 행 추가)을 그대로 재사용한다. 데스크탑은 테이블, 모바일(`md:` 미만)은 카드 레이아웃으로 동일 데이터를 렌더링한다. 상세 편집은 `vaul` 기반 모달/바텀시트로 분리한다.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase(Postgres+RLS), Zod, Tailwind CSS, vaul, react-markdown + remark-gfm (기존 의존성 그대로 사용, 신규 패키지 없음)

**Spec:** `docs/superpowers/specs/2026-11-09-structured-todo-design.md`

## Global Constraints

- `diary_todo_items`는 신규 테이블로 생성하고, 기존 `diary_notes` 테이블/데이터는 삭제하거나 변형하지 않는다 (spec "비범위").
- `is_done`/완료 체크 UI는 만들지 않는다 (spec에서 명시적으로 제외).
- 요일은 DB에 저장하지 않고 `item_date`에서 클라이언트가 계산한다.
- 날짜/시간/대상/상세는 리스트 인라인에서 수정하지 않고 상세보기 모달에서만 수정한다. 인라인에서 직접 수정 가능한 필드는 `title`(텍스트)과 `importance`(클릭 순환)뿐이다.
- 모바일 브레이크포인트는 프로젝트 전역 컨벤션인 Tailwind `md:`를 그대로 사용한다.
- 이 프로젝트에는 자동화 테스트 프레임워크가 없다 (jest/vitest 미설치). "테스트" 단계는 `pnpm build` 통과 + 로컬 `pnpm dev`로 수동 확인으로 대체한다. TDD의 "실패 확인→구현→통과 확인" 사이클은 수동 확인으로 수행한다.
- RLS 정책은 기존 테이블들과 동일하게 `user_id = auth.uid()` 전체 CRUD.
- 커밋 메시지는 기존 컨벤션(`feat:`, `fix:` 등) + 끝에 `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

## Review Focus

- `item_date`가 과거인데 비어있지 않은 경우 날짜가 빨간색으로 강조되는지 (완료 여부와 무관하게 단순 날짜 비교로 동작해야 함 — `is_done`이 없으므로 "지연"이 아니라 "과거 날짜"라는 사실만 표시)
- `title` 공백만 입력했을 때 저장이 거부되는지 (trim 후 빈 문자열 검증)
- `item_date` 없이 `item_time`만 있는 조합이 들어왔을 때 UI가 깨지지 않는지 (spec은 "날짜 있고 시간 없음"만 명시 — 반대 조합도 방어적으로 처리)
- 모바일 카드에서 `target`이 빈 문자열일 때 레이아웃이 빈 줄을 남기지 않고 완전히 생략되는지
- 상세보기 모달에서 "저장" 없이 닫았을 때(바텀시트 바깥 탭, ESC 등) 변경사항이 반영되지 않는지 (spec: 자동저장 아님)

---

## File Structure

- `supabase/migrations/0012_diary_todo_items.sql` — 신규 테이블 + RLS (생성)
- `lib/validators/diary-todo-items.ts` — Zod 스키마 (생성)
- `lib/actions/diary-todo-items.ts` — add/update/delete server actions (생성)
- `lib/utils/diary-todo-date.ts` — 날짜→요일 계산, 과거 날짜 판별, YYMMDD 포맷 유틸 (생성)
- `components/diary/todo/TodoList.tsx` — 서버에서 받은 데이터 정렬(스케줄/메모 그룹) 후 데스크탑/모바일 분기 렌더링 (생성)
- `components/diary/todo/TodoRow.tsx` — 데스크탑 테이블 1행 (생성)
- `components/diary/todo/TodoCard.tsx` — 모바일 카드 1개 (생성)
- `components/diary/todo/TodoAddRow.tsx` — 연속 추가 입력행 (가계부 `TransactionAddRow` 패턴, 생성)
- `components/diary/todo/TodoDetailModal.tsx` — 상세보기/수정/삭제 모달 (vaul 기반, 생성)
- `components/diary/todo/ImportanceBadge.tsx` — 중요도 뱃지 + 클릭 순환 (생성)
- `app/diary/notes/page.tsx` — 신규 구조로 전면 교체 (수정)
- `components/common/GlobalHeader.tsx` — `NAV_ITEMS`에 "To Do" 추가 (수정)
- `components/diary/notes/NoteCard.tsx` — 더 이상 사용되지 않음, 삭제 (삭제는 Task 7에서)

---

### Task 1: DB 스키마 — `diary_todo_items` 테이블 + RLS

**Files:**
- Create: `supabase/migrations/0012_diary_todo_items.sql`

**Interfaces:**
- Produces: 테이블 `public.diary_todo_items(id uuid pk, user_id uuid, kind text, importance text, item_date date null, item_time time null, target text null, title text, detail text null, sort_order int, created_at timestamptz, updated_at timestamptz)`, RLS `own_rows` 정책 (후속 Task들이 이 스키마로 쿼리함)

- [ ] **Step 1: 마이그레이션 SQL 작성**

`supabase/migrations/0009_diary_notes.sql`과 동일한 스타일(주석 1~2줄 + create table + RLS)로 작성한다. 컬럼은 spec의 데이터 모델 표 그대로:

```sql
create table public.diary_todo_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('todo', 'wish')),
  importance text not null default 'mid' check (importance in ('high', 'mid', 'low')),
  item_date date,
  item_time time,
  target text,
  title text not null check (char_length(trim(title)) > 0),
  detail text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.diary_todo_items enable row level security;

create policy "own_rows" on public.diary_todo_items for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create index diary_todo_items_user_kind_idx on public.diary_todo_items (user_id, kind);
```

- [ ] **Step 2: Supabase MCP로 마이그레이션 적용**

`mcp__claude_ai_Supabase__apply_migration` (또는 세션에서 쓰던 `execute_sql`)로 위 SQL을 프로젝트(`iwrcprtjyxzfsriiupsw`)에 적용.

- [ ] **Step 3: 적용 확인**

`list_tables`로 `diary_todo_items`가 생성됐는지, RLS가 활성화됐는지 확인.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0012_diary_todo_items.sql
git commit -m "feat: diary_todo_items 테이블 및 RLS 추가"
```

---

### Task 2: Zod 검증 스키마

**Files:**
- Create: `lib/validators/diary-todo-items.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `KindSchema: z.ZodEnum<["todo","wish"]>`
  - `ImportanceSchema: z.ZodEnum<["high","mid","low"]>`
  - `AddTodoItemSchema`, `UpdateTodoItemSchema`, `DeleteTodoItemSchema`
  - `type AddTodoItemInput`, `type UpdateTodoItemInput`, `type DeleteTodoItemInput`, `type TodoItemKind`, `type TodoItemImportance`

- [ ] **Step 1: `lib/validators/transactions.ts` 패턴을 참고해 스키마 작성**

```ts
export const KindSchema = z.enum(["todo", "wish"])
export const ImportanceSchema = z.enum(["high", "mid", "low"])

export const AddTodoItemSchema = z.object({
  kind: KindSchema,
  importance: ImportanceSchema.default("mid"),
  item_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  item_time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  target: z.string().max(200).optional().nullable(),
  title: z.string().trim().min(1, "항목은 필수").max(200),
  detail: z.string().max(20000).optional().nullable(),
})

export const UpdateTodoItemSchema = AddTodoItemSchema.partial().extend({
  id: z.string().uuid(),
})

export const DeleteTodoItemSchema = z.object({ id: z.string().uuid() })
```

타입은 `z.infer`로 export (`AddTransactionSchema` 패턴과 동일).

- [ ] **Step 2: `pnpm build`로 타입 에러 없는지 확인 (이 시점엔 미사용 export라 noUnusedLocals 걱정 없음)**

Run: `pnpm exec tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add lib/validators/diary-todo-items.ts
git commit -m "feat: diary_todo_items 입력 검증 스키마 추가"
```

---

### Task 3: 날짜/요일 유틸

**Files:**
- Create: `lib/utils/diary-todo-date.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `getKoreanWeekday(dateStr: string): string` — `"YYYY-MM-DD"` → `"월"|"화"|"수"|"목"|"금"|"토"|"일"`
  - `formatYymmdd(dateStr: string): string` — `"2026-11-15"` → `"251115"`
  - `isPastDate(dateStr: string): boolean` — 오늘(KST 기준) 이전이면 true

- [ ] **Step 1: 함수 3개 구현**

`date-fns`가 이미 의존성에 있으므로 (`format`, `isBefore`, `startOfDay`) 활용. 타임존은 로컬(Vercel icn1 서버 로컬 시간대 기준, 기존 프로젝트가 별도 타임존 처리를 안 하므로 동일 관례 유지)로 처리.

- [ ] **Step 2: 수동 확인 (node REPL 또는 임시 스크립트)**

`node -e` 또는 `pnpm exec tsx`로 2026-11-15(일) → "일", "251115" 출력 확인. (date-fns locale 'ko' 로 getDay 기반 매핑도 가능; 직접 배열 매핑 `["일","월","화","수","목","금","토"][getDay(date)]`이 더 간단하고 디펜던시 적음 — 이 방식 추천)

- [ ] **Step 3: Commit**

```bash
git add lib/utils/diary-todo-date.ts
git commit -m "feat: 할 일 항목 날짜/요일 포맷 유틸 추가"
```

---

### Task 4: 서버 액션 (add/update/delete)

**Files:**
- Create: `lib/actions/diary-todo-items.ts`

**Interfaces:**
- Consumes: `AddTodoItemSchema`, `UpdateTodoItemSchema`, `DeleteTodoItemSchema`, `AddTodoItemInput`, `UpdateTodoItemInput`, `DeleteTodoItemInput` (Task 2)
- Produces:
  - `addTodoItem(input: AddTodoItemInput): Promise<{ok:true,id:string}|{ok:false,error:string}>`
  - `updateTodoItem(input: UpdateTodoItemInput): Promise<{ok:true}|{ok:false,error:string}>`
  - `deleteTodoItem(input: DeleteTodoItemInput): Promise<{ok:true}|{ok:false,error:string}>`

- [ ] **Step 1: `lib/actions/transactions.ts`의 `getAuthedClient()` + `addTransaction` 패턴을 그대로 복제해 3개 액션 작성**

각 액션: Zod parse → 인증 확인 → `.from("diary_todo_items")` insert/update/delete → `revalidatePath("/diary/notes")` → `{ok:true,...}` 반환. 에러 시 `{ok:false, error: ...}`.

`addTodoItem`은 `sort_order`를 자동 계산(같은 `kind`+날짜없음 그룹 내 최댓값+1)하지 말고, 호출 측(Task 6의 `TodoAddRow`)에서 `Date.now()` 같은 단조 증가값을 넘기게 한다 — DB round-trip 없이 간단하게 처리.

- [ ] **Step 2: `pnpm exec tsc --noEmit`로 타입 확인**

Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add lib/actions/diary-todo-items.ts
git commit -m "feat: diary_todo_items CRUD 서버 액션 추가"
```

---

### Task 5: 공용 UI 조각 — 중요도 뱃지, 정렬 로직

**Files:**
- Create: `components/diary/todo/ImportanceBadge.tsx`
- Create: `components/diary/todo/sortTodoItems.ts`

**Interfaces:**
- Consumes: `TodoItemImportance` (Task 2)
- Produces:
  - `ImportanceBadge({ importance, onCycle }: { importance: TodoItemImportance; onCycle?: () => void })` — 색상 뱃지(빨강=high/노랑=mid/초록=low), `onCycle` 있으면 클릭 가능
  - `TodoItemRow` 타입 (id, kind, importance, item_date, item_time, target, title, detail, sort_order)
  - `sortTodoItems(items: TodoItemRow[]): TodoItemRow[]` — spec 정렬 규칙(스케줄 그룹 날짜·시간 오름차순 먼저, 메모 그룹 sort_order 오름차순 그 다음) 적용

- [ ] **Step 1: `ImportanceBadge` 구현**

high=`bg-red-100 text-red-700`, mid=`bg-yellow-100 text-yellow-700`, low=`bg-emerald-100 text-emerald-700`. `onCycle` prop 있으면 `<button>`, 없으면 `<span>`.

- [ ] **Step 2: `sortTodoItems` 구현**

```ts
export function sortTodoItems(items: TodoItemRow[]): TodoItemRow[] {
  const scheduled = items.filter((i) => i.item_date !== null)
  const memo = items.filter((i) => i.item_date === null)
  scheduled.sort((a, b) =>
    (a.item_date! + (a.item_time ?? "00:00")).localeCompare(
      b.item_date! + (b.item_time ?? "00:00")
    )
  )
  memo.sort((a, b) => a.sort_order - b.sort_order)
  return [...scheduled, ...memo]
}
```

- [ ] **Step 3: 수동 확인**

임시로 `console.log(sortTodoItems([...]))` 로 날짜 있는 항목이 먼저, 그 안에서 날짜·시간순, 그 다음 메모 그룹이 sort_order순인지 확인 후 로그 제거.

- [ ] **Step 4: Commit**

```bash
git add components/diary/todo/ImportanceBadge.tsx components/diary/todo/sortTodoItems.ts
git commit -m "feat: 할 일 항목 중요도 뱃지 및 정렬 로직 추가"
```

---

### Task 6: 데스크탑 테이블 + 모바일 카드 (읽기 전용 렌더링)

**Files:**
- Create: `components/diary/todo/TodoRow.tsx`
- Create: `components/diary/todo/TodoCard.tsx`
- Create: `components/diary/todo/TodoList.tsx`

**Interfaces:**
- Consumes: `TodoItemRow`, `sortTodoItems` (Task 5), `ImportanceBadge` (Task 5), `getKoreanWeekday`/`formatYymmdd`/`isPastDate` (Task 3), `updateTodoItem` (Task 4)
- Produces: `TodoList({ items, kind }: { items: TodoItemRow[]; kind: TodoItemKind })` — Task 8에서 페이지가 사용. 내부에서 "상세 ⋯" 클릭 시 열 모달은 아직 연결하지 않고 `onOpenDetail?: (id: string) => void` prop으로 콜백만 노출(Task 7에서 연결).

- [ ] **Step 1: `TodoRow.tsx` (데스크탑, `hidden md:grid`) 구현**

spec의 그리드 비율(`중요도 56px · 날짜 72px · 요일 36px · 시간 56px · 대상 1fr · 항목 2fr · 상세 32px`) 그대로. `title`은 `font-bold`. 클릭하면 인라인 편집(가계부 금액 셀 패턴: 클릭 시 input으로 전환, Enter/blur 시 `updateTodoItem({id, title})` 호출). `item_date` 있고 과거면 `text-red-600`. `ImportanceBadge`에 `onCycle`로 high→mid→low→high 순환 연결(클릭 시 `updateTodoItem` 호출).

- [ ] **Step 2: `TodoCard.tsx` (모바일, `md:hidden`) 구현**

spec의 3행 카드 레이아웃. `target`이 빈 값/null이면 3행 자체를 렌더링하지 않음(완전 생략, 빈 줄 금지 — Review Focus 항목).

- [ ] **Step 3: `TodoList.tsx` 구현**

```ts
export function TodoList({
  items,
  onOpenDetail,
}: {
  items: TodoItemRow[]
  onOpenDetail: (id: string) => void
}) {
  const sorted = sortTodoItems(items)
  return (
    <div>
      {sorted.map((item) => (
        <div key={item.id}>
          <TodoRow item={item} onOpenDetail={onOpenDetail} />
          <TodoCard item={item} onOpenDetail={onOpenDetail} />
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: `pnpm exec tsc --noEmit` 통과 확인**

- [ ] **Step 5: Commit**

```bash
git add components/diary/todo/TodoRow.tsx components/diary/todo/TodoCard.tsx components/diary/todo/TodoList.tsx
git commit -m "feat: 할 일 항목 데스크탑 테이블/모바일 카드 렌더링 추가"
```

---

### Task 7: 상세보기 모달 (vaul)

**Files:**
- Create: `components/diary/todo/TodoDetailModal.tsx`

**Interfaces:**
- Consumes: `TodoItemRow` (Task 5), `updateTodoItem`, `deleteTodoItem` (Task 4), `ImportanceBadge` (Task 5)
- Produces: `TodoDetailModal({ item, open, onOpenChange }: { item: TodoItemRow | null; open: boolean; onOpenChange: (open: boolean) => void })`

- [ ] **Step 1: 기존 vaul 사용처 확인 후 동일 패턴으로 Drawer 구성**

`components/ui/` 내 기존 vaul 래퍼(있다면)를 재사용. 없으면 `vaul`의 `Drawer.Root/Content` 직접 사용. 데스크탑(`md:` 이상)은 같은 컴포넌트를 모달처럼 중앙 배치(`Drawer`의 `direction` prop 또는 CSS로 분기 — 간단히 모바일은 bottom, 데스크탑은 `max-w-md mx-auto my-20` 스타일로 동일 컴포넌트 재사용).

- [ ] **Step 2: 필드 구성**

중요도(`ImportanceBadge` 순환 클릭), 날짜(`<input type="date">`), 요일(읽기전용, `item_date`로부터 `getKoreanWeekday` 계산해 텍스트만 표시, 입력 불가), 시간(`<input type="time">`), 대상(`<input type="text">`), 항목(`<input type="text">` 필수), 상세(`<textarea>` + `ReactMarkdown`/`remark-gfm` 미리보기 — `NoteCard.tsx`의 prose 클래스 재사용).

로컬 draft state로 편집하다가 "저장" 버튼 클릭 시에만 `updateTodoItem(draft)` 호출 + `onOpenChange(false)`. 바깥 클릭/ESC로 닫히면(draft 버림) 저장 호출 없이 그냥 닫음 — Review Focus 항목.

- [ ] **Step 3: "삭제" 버튼**

클릭 시 `deleteTodoItem({id})` 호출 후 모달 닫음. (확인 다이얼로그 없이 바로 삭제 — spec에 별도 confirm 요구 없음, 단 버튼은 리스트가 아닌 모달 안에만 존재해 실수 위험 낮춤)

- [ ] **Step 4: `title` 빈 값 저장 시도 시 "항목은 필수" 토스트 표시 후 저장 막기**

(Review Focus 항목 — 클라이언트에서 trim 후 빈 문자열이면 `toast.error`로 막고 `updateTodoItem` 호출 안 함)

- [ ] **Step 5: `pnpm exec tsc --noEmit` 통과 확인**

- [ ] **Step 6: Commit**

```bash
git add components/diary/todo/TodoDetailModal.tsx
git commit -m "feat: 할 일 항목 상세보기/수정/삭제 모달 추가"
```

---

### Task 8: 연속 추가 입력행

**Files:**
- Create: `components/diary/todo/TodoAddRow.tsx`

**Interfaces:**
- Consumes: `addTodoItem` (Task 4), `TodoItemKind` (Task 2)
- Produces: `TodoAddRow({ kind }: { kind: TodoItemKind })`

- [ ] **Step 1: `components/budget/month/TransactionAddRow.tsx`의 연속 추가 패턴을 그대로 이식**

차이점: 필드는 `title`만 입력받음(날짜/시간/대상/상세는 상세모달에서 채움, Global Constraints 참고). "+ 새 항목" 클릭 → input 노출 → 입력 후 Enter 또는 "추가" 버튼 → `addTodoItem({kind, title, sort_order: Date.now()})` 호출 → 성공 시 input 비우고 포커스 유지(계속 입력 가능) → "완료" 버튼으로 종료.

- [ ] **Step 2: 빈 문자열 제출 방지**

`title.trim().length === 0`이면 "추가" 비활성화(가계부 `allRequiredFilled` 패턴과 동일 — Review Focus의 title 빈값 케이스를 추가 단계에서도 방어).

- [ ] **Step 3: `pnpm exec tsc --noEmit` 통과 확인**

- [ ] **Step 4: Commit**

```bash
git add components/diary/todo/TodoAddRow.tsx
git commit -m "feat: 할 일 항목 연속 추가 입력행 추가"
```

---

### Task 9: 페이지 교체 + 헤더 메뉴

**Files:**
- Modify: `app/diary/notes/page.tsx`
- Modify: `components/common/GlobalHeader.tsx`
- Delete: `components/diary/notes/NoteCard.tsx`

**Interfaces:**
- Consumes: `TodoList`, `TodoAddRow`, `TodoDetailModal` (Task 6, 7, 8), `addTodoItem`/`updateTodoItem`/`deleteTodoItem` (Task 4)
- Produces: 없음 (최종 통합 지점)

- [ ] **Step 1: `app/diary/notes/page.tsx` 전면 교체**

`app/budget/[ym]/page.tsx`처럼 서버 컴포넌트에서 `diary_todo_items`를 `kind`별로 조회(`.eq("user_id", ...)` 불필요 — RLS가 처리; `.order()`는 생략하고 클라이언트 `sortTodoItems`에 위임해도 되지만, 초기 로드 안정성을 위해 `.order("created_at")`로 1차 정렬 후 클라이언트에서 재정렬). "할 것"/"하고 싶은 것" 두 섹션, 각각 `TodoList` + `TodoAddRow`. 상세모달 오픈 상태(`selectedId`)는 클라이언트 wrapper 컴포넌트가 필요하면 새로 만들되, 기존 패턴처럼 최소한의 `"use client"` 컴포넌트로 감싼다(이 페이지 자체를 클라이언트로 바꾸지 않고, 모달 상태만 담당하는 작은 클라이언트 컴포넌트를 하나 추가하는 것도 허용 — 이름은 `TodoSection.tsx`로 Task 6/7/8 결과물을 조합).

> 참고: Task 6의 `TodoList`가 요구하는 `onOpenDetail` 콜백과 모달 열림 상태를 쥐고 있을 곳이 필요하므로, 이 Task에서 `components/diary/todo/TodoSection.tsx`(`"use client"`)를 추가로 만들어 `items`를 받아 `TodoList` + `TodoDetailModal` + `TodoAddRow`를 한 덩어리로 묶는다. `app/diary/notes/page.tsx`는 서버에서 데이터만 fetch해서 `TodoSection`에 넘긴다.

- [ ] **Step 2: `components/common/GlobalHeader.tsx`의 `NAV_ITEMS`에 추가**

```ts
const NAV_ITEMS = [
  { label: "가계부", href: "/budget" },
  { label: "To Do", href: "/diary/notes" },
  { label: "일기장", href: "/diary" },
  { label: "운동기록", href: "/workout" },
] as const
```

- [ ] **Step 3: `components/diary/notes/NoteCard.tsx` 삭제**

더 이상 어디서도 import하지 않는지 `grep -r "NoteCard" app components`로 확인 후 삭제.

- [ ] **Step 4: `pnpm exec tsc --noEmit` 및 `pnpm build` 통과 확인**

Run: `pnpm build`
Expected: 빌드 성공, 타입 에러 없음

- [ ] **Step 5: `pnpm dev`로 수동 확인**

- `/diary/notes` 접속 → 헤더에 "To Do" 노출 및 활성 상태 확인
- "+ 새 항목"으로 2~3개 추가, 연속 입력 되는지
- 중요도 클릭 순환 확인
- 상세보기 모달에서 날짜/시간/대상/상세 입력 후 저장 → 리스트에 반영 확인
- 날짜를 과거로 설정 → 목록에서 빨간색 표시 확인
- 날짜 비운 항목이 메모 그룹(하단)으로 가는지, 날짜 있는 항목이 스케줄 그룹(상단)에 날짜순으로 있는지 확인
- 모바일 뷰(브라우저 반응형 또는 아이폰 15 Pro Max 시뮬레이터 폭 430px)에서 카드 레이아웃이 가로 스크롤 없이 보이는지, `target` 없는 카드가 3행 없이 짧게 나오는지 확인
- 삭제 버튼으로 항목 삭제 확인

- [ ] **Step 6: Commit**

```bash
git add app/diary/notes/page.tsx components/common/GlobalHeader.tsx components/diary/todo/TodoSection.tsx
git rm components/diary/notes/NoteCard.tsx
git commit -m "feat: 할 일 리스트 페이지 교체 및 헤더에 To Do 메뉴 추가"
```

- [ ] **Step 7: 배포 후 실제 환경 확인**

`git push origin main` → Vercel 배포 완료 대기 → 실제 URL에서 Step 5와 동일한 체크리스트 재확인 (이전 세션들에서 쓰던 패턴: `list_deployments`로 READY 확인 후 안내).

---

## Self-Review

**Spec coverage:** 데이터 모델(Task 1,2) / 요일 자동계산(Task 3) / 정렬·예외처리(Task 5, Review Focus) / 데스크탑·모바일 레이아웃(Task 6) / 상세모달(Task 7) / 연속추가(Task 8) / 헤더·페이지 교체(Task 9) — spec 전 섹션 커버됨. 마이그레이션 비범위(기존 `diary_notes` 미삭제)는 Global Constraints에 명시, 별도 태스크 없음(해당 없음이 맞음).

**타입 일관성:** `TodoItemRow`, `TodoItemKind`, `TodoItemImportance` 이름을 Task 2/5/6/7/8/9에서 동일하게 사용하도록 통일함.

**비례성:** 이 프로젝트는 테스트 프레임워크가 없어 "테스트 작성" 스텝 대신 수동 확인 스텝으로 대체했다 — 코드가 아닌 결정(파일 분리, 인터페이스, 수동 확인 체크리스트) 위주로 작성됨.
