# 운동기록 Phase 1 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strong앱 5년 데이터 대체용 PWA 운동기록. 빈 워크아웃·템플릿 기반 모두 지원. 세트 입력(W/working/F) + PR 자동 트리거 + 완료 화면. 가계부·일기장 패턴 답습.

**Architecture:** 신규 7개 Supabase 테이블 + 3개 트리거 + 사이드바용 RPC 함수. 가계부 동일 server-actions/RSC fetch 패턴. URL은 `/workout/start`(메인) · `/workout/session/[id]`(활성 세션) · `/workout/exercises` · `/workout/templates`. session·PR은 스냅샷, template/routine은 FK 유지.

**Tech Stack:** Next.js 14 + TypeScript + Tailwind v3 + shadcn/base-ui Select/Dialog + vaul Drawer + Supabase + Zod + sonner toast.

**Spec:** `docs/superpowers/specs/2026-06-01-workout-module-design.md`

**테스트 전략:** 자동 테스트 인프라 없음. 각 task 후 `pnpm exec tsc --noEmit`. 전체 끝나면 §Manual Test Gates 수동 검증.

**시간 박스:** 24시간 (2026-06-02 만료 전). Task 1~13 = MVP. 우선순위: 세션 화면(Task 9~11) > 종목/템플릿(Task 7~8) > 사이드바(Task 12).

---

## File Structure

### 신규 — 마이그레이션
- `supabase/migrations/0011_workout_module_schema.sql`

### 신규 — 검증
- `lib/validators/workout.ts`

### 신규 — 유틸
- `lib/utils/workout-1rm.ts` — Epley 공식
- `lib/utils/workout-format.ts` — 시간/무게 포맷

### 신규 — 서버 액션
- `lib/actions/workout-exercises.ts`
- `lib/actions/workout-templates.ts`
- `lib/actions/workout-sessions.ts`
- `lib/actions/workout-sets.ts`

### 신규 — 라우트
- `app/workout/layout.tsx`
- `app/workout/page.tsx` (redirect → /workout/start)
- `app/workout/start/page.tsx`
- `app/workout/exercises/page.tsx`
- `app/workout/templates/page.tsx`
- `app/workout/session/[id]/page.tsx`
- `app/workout/session/[id]/complete/page.tsx`

### 신규 — 컴포넌트
- `components/workout/sidebar/WorkoutSidebar.tsx` — Server: RPC fetch
- `components/workout/sidebar/WorkoutSidebarTree.tsx` — Client: collapse 상태
- `components/workout/start/EmptyWorkoutButton.tsx`
- `components/workout/start/TemplateFolderList.tsx`
- `components/workout/start/RoutineCard.tsx`
- `components/workout/exercises/ExerciseList.tsx`
- `components/workout/exercises/ExerciseRow.tsx`
- `components/workout/exercises/NewExerciseDialog.tsx`
- `components/workout/templates/FolderEditor.tsx`
- `components/workout/templates/RoutineEditor.tsx`
- `components/workout/session/SessionHeader.tsx`
- `components/workout/session/ExerciseBlock.tsx`
- `components/workout/session/SetRow.tsx`
- `components/workout/session/SetTypePicker.tsx`
- `components/workout/session/AddExerciseSheet.tsx`
- `components/workout/session/FinishButton.tsx`
- `components/workout/complete/CompleteScreen.tsx`

---

## Task 1: 마이그레이션 0011 (7 테이블 + RLS + 트리거 + RPC)

**Files:**
- Create: `supabase/migrations/0011_workout_module_schema.sql`

- [ ] **Step 1: SQL 파일 작성**

```sql
-- ==========================
-- 운동기록 모듈 마이그레이션 0011
-- 7 테이블 + RLS + 3개 트리거 + 사이드바 RPC
-- ==========================

-- 운동 종목 마스터
create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  body_part text not null check (body_part in (
    'Arms','Back','Cardio','Chest','Core','Full Body','Legs','Olympic','Other','Shoulders'
  )),
  category text not null check (category in (
    'Barbell','Dumbbell','Machine','Cable','Bodyweight','Assisted Bodyweight','Reps Only','Cardio','Duration','Other'
  )),
  sort_order int not null default 0,
  created_at timestamptz default now(),
  unique (user_id, name)
);
alter table public.workout_exercises enable row level security;
create policy "own_rows" on public.workout_exercises for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 템플릿 폴더
create table public.workout_template_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz default now()
);
alter table public.workout_template_folders enable row level security;
create policy "own_rows" on public.workout_template_folders for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 루틴
create table public.workout_routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid references public.workout_template_folders(id) on delete set null,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.workout_routines enable row level security;
create policy "own_rows" on public.workout_routines for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 루틴 내 운동
create table public.workout_routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.workout_routines(id) on delete cascade,
  exercise_id uuid not null references public.workout_exercises(id) on delete cascade,
  default_sets int not null default 3,
  sort_order int not null default 0
);
alter table public.workout_routine_exercises enable row level security;
create policy "via_routine" on public.workout_routine_exercises for all
  using (exists (
    select 1 from public.workout_routines r
    where r.id = routine_id and r.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.workout_routines r
    where r.id = routine_id and r.user_id = auth.uid()
  ));

-- 워크아웃 세션
create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_minutes int,
  routine_id uuid,
  routine_name text,
  folder_name text,
  total_weight_kg numeric(10,2) not null default 0,
  pr_count int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index workout_sessions_user_date_idx on public.workout_sessions(user_id, date desc);
alter table public.workout_sessions enable row level security;
create policy "own_rows" on public.workout_sessions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 세션 내 운동 (스냅샷)
create table public.workout_session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id uuid,
  exercise_name text not null,
  body_part text not null,
  category text not null,
  sort_order int not null default 0
);
create index workout_session_exercises_session_idx on public.workout_session_exercises(session_id, sort_order);
alter table public.workout_session_exercises enable row level security;
create policy "via_session" on public.workout_session_exercises for all
  using (exists (
    select 1 from public.workout_sessions s
    where s.id = session_id and s.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.workout_sessions s
    where s.id = session_id and s.user_id = auth.uid()
  ));

-- 세트
create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  session_exercise_id uuid not null references public.workout_session_exercises(id) on delete cascade,
  set_number int not null,
  set_type text not null check (set_type in ('warmup','working','failure')) default 'working',
  weight_kg numeric(7,2),
  reps int,
  duration_seconds int,
  completed boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz default now()
);
create index workout_sets_session_exercise_idx on public.workout_sets(session_exercise_id, sort_order);
alter table public.workout_sets enable row level security;
create policy "via_session_exercise" on public.workout_sets for all
  using (exists (
    select 1
    from public.workout_session_exercises se
    join public.workout_sessions s on s.id = se.session_id
    where se.id = session_exercise_id and s.user_id = auth.uid()
  ))
  with check (exists (
    select 1
    from public.workout_session_exercises se
    join public.workout_sessions s on s.id = se.session_id
    where se.id = session_exercise_id and s.user_id = auth.uid()
  ));

-- PR 자동 추적
create table public.workout_personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_name text not null,
  weight_kg numeric(7,2) not null,
  reps int not null,
  estimated_1rm numeric(10,2) not null,
  achieved_at timestamptz not null default now(),
  session_id uuid references public.workout_sessions(id) on delete set null,
  set_id uuid references public.workout_sets(id) on delete set null
);
create index workout_personal_records_user_exercise_idx
  on public.workout_personal_records(user_id, exercise_name, estimated_1rm desc);
alter table public.workout_personal_records enable row level security;
create policy "own_rows" on public.workout_personal_records for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ==========================
-- 트리거 1: workout_sets → 세션 total_weight_kg 재계산 + PR 체크
-- ==========================

create or replace function public.recalc_session_after_set()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_user_id uuid;
  v_exercise_name text;
  v_best_1rm numeric;
  v_best_weight numeric;
  v_best_reps int;
  v_best_set_id uuid;
  v_existing_pr_1rm numeric;
begin
  -- 영향받은 세션 id 추출
  if (tg_op = 'DELETE') then
    select se.session_id, se.exercise_name, s.user_id
      into v_session_id, v_exercise_name, v_user_id
      from public.workout_session_exercises se
      join public.workout_sessions s on s.id = se.session_id
      where se.id = old.session_exercise_id;
  else
    select se.session_id, se.exercise_name, s.user_id
      into v_session_id, v_exercise_name, v_user_id
      from public.workout_session_exercises se
      join public.workout_sessions s on s.id = se.session_id
      where se.id = new.session_exercise_id;
  end if;

  if v_session_id is null then return coalesce(new, old); end if;

  -- 1) total_weight_kg 재계산
  update public.workout_sessions
  set total_weight_kg = coalesce((
    select sum(coalesce(s.weight_kg, 0) * coalesce(s.reps, 0))
    from public.workout_sets s
    join public.workout_session_exercises se on se.id = s.session_exercise_id
    where se.session_id = v_session_id and s.completed = true
  ), 0),
  updated_at = now()
  where id = v_session_id;

  -- 2) PR 체크 (working AND completed AND weight/reps not null)
  select max(weight_kg * (1 + reps::numeric / 30)) into v_best_1rm
    from public.workout_sets s
    join public.workout_session_exercises se on se.id = s.session_exercise_id
    where se.session_id = v_session_id
      and se.exercise_name = v_exercise_name
      and s.set_type = 'working'
      and s.completed = true
      and s.weight_kg is not null
      and s.reps is not null;

  if v_best_1rm is not null then
    select coalesce(max(estimated_1rm), 0) into v_existing_pr_1rm
      from public.workout_personal_records
      where user_id = v_user_id and exercise_name = v_exercise_name;

    if v_best_1rm > v_existing_pr_1rm then
      select s.weight_kg, s.reps, s.id into v_best_weight, v_best_reps, v_best_set_id
        from public.workout_sets s
        join public.workout_session_exercises se on se.id = s.session_exercise_id
        where se.session_id = v_session_id
          and se.exercise_name = v_exercise_name
          and s.set_type = 'working'
          and s.completed = true
          and s.weight_kg is not null
          and s.reps is not null
        order by (s.weight_kg * (1 + s.reps::numeric / 30)) desc
        limit 1;

      insert into public.workout_personal_records
        (user_id, exercise_name, weight_kg, reps, estimated_1rm, session_id, set_id)
      values
        (v_user_id, v_exercise_name, v_best_weight, v_best_reps, v_best_1rm, v_session_id, v_best_set_id);

      update public.workout_sessions
      set pr_count = pr_count + 1
      where id = v_session_id;
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

create trigger trg_workout_sets_recalc
after insert or update or delete on public.workout_sets
for each row execute function public.recalc_session_after_set();

-- ==========================
-- 트리거 2: workout_sessions.ended_at → duration_minutes
-- ==========================

create or replace function public.calc_session_duration()
returns trigger
language plpgsql
as $$
begin
  if new.ended_at is not null then
    new.duration_minutes := greatest(0, extract(epoch from (new.ended_at - new.started_at))::int / 60);
  else
    new.duration_minutes := null;
  end if;
  return new;
end;
$$;

create trigger trg_workout_sessions_duration
before update of ended_at on public.workout_sessions
for each row execute function public.calc_session_duration();

-- ==========================
-- RPC: 사이드바용 distinct dates + 그날 첫 세션 라벨
-- ==========================

create or replace function public.get_user_workout_dates()
returns table(date date, label text)
language sql
stable
security invoker
set search_path = public
as $$
  select s.date,
         (select coalesce(s2.routine_name, '워크아웃')
          from public.workout_sessions s2
          where s2.user_id = auth.uid() and s2.date = s.date
          order by s2.started_at asc
          limit 1) as label
  from public.workout_sessions s
  where s.user_id = auth.uid()
  group by s.date
  order by s.date desc;
$$;
grant execute on function public.get_user_workout_dates() to authenticated;
```

- [ ] **Step 2: MCP로 마이그레이션 적용**

```
mcp__claude_ai_Supabase__apply_migration:
  project_id: iwrcprtjyxzfsriiupsw
  name: 0011_workout_module_schema
  query: (위 SQL 전체)
```

- [ ] **Step 3: 적용 검증**

```sql
-- mcp__claude_ai_Supabase__execute_sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'workout_%'
ORDER BY table_name;
```
Expected 7 rows: workout_exercises, workout_personal_records, workout_routine_exercises, workout_routines, workout_session_exercises, workout_sessions, workout_sets, workout_template_folders → 8 rows total.

- [ ] **Step 4: 커밋**

```bash
git add supabase/migrations/0011_workout_module_schema.sql
git commit -m "feat(workout): 마이그레이션 0011 — 7 테이블 + RLS + 트리거 + RPC

- workout_exercises/template_folders/routines/routine_exercises/sessions/session_exercises/sets/personal_records
- RLS: 직접 user_id 또는 부모를 통한 EXISTS
- trg_workout_sets_recalc: total_weight_kg 재계산 + PR 자동 INSERT (Epley)
- trg_workout_sessions_duration: ended_at 변경 시 duration_minutes 자동
- RPC get_user_workout_dates: 사이드바용 distinct 날짜+라벨"
```

---

## Task 2: 검증 스키마 + Epley/포맷 유틸

**Files:**
- Create: `lib/validators/workout.ts`
- Create: `lib/utils/workout-1rm.ts`
- Create: `lib/utils/workout-format.ts`

- [ ] **Step 1: validators 작성**

```typescript
// lib/validators/workout.ts
import { z } from "zod"

export const BodyPartEnum = z.enum([
  "Arms","Back","Cardio","Chest","Core","Full Body","Legs","Olympic","Other","Shoulders",
])
export const CategoryEnum = z.enum([
  "Barbell","Dumbbell","Machine","Cable","Bodyweight","Assisted Bodyweight","Reps Only","Cardio","Duration","Other",
])
export const SetTypeEnum = z.enum(["warmup", "working", "failure"])

export const ExerciseInputSchema = z.object({
  name: z.string().trim().min(1, "이름 필수").max(100),
  body_part: BodyPartEnum,
  category: CategoryEnum,
})

export const FolderInputSchema = z.object({
  name: z.string().trim().min(1, "이름 필수").max(80),
})

export const RoutineInputSchema = z.object({
  name: z.string().trim().min(1, "이름 필수").max(80),
  folder_id: z.string().uuid().nullable(),
})

export const RoutineExerciseInputSchema = z.object({
  routine_id: z.string().uuid(),
  exercise_id: z.string().uuid(),
  default_sets: z.number().int().min(1).max(20),
})

export const SetInputSchema = z.object({
  session_exercise_id: z.string().uuid(),
  set_type: SetTypeEnum,
  weight_kg: z.number().nullable(),
  reps: z.number().int().min(0).nullable(),
  duration_seconds: z.number().int().min(0).nullable(),
  completed: z.boolean(),
})

export type BodyPart = z.infer<typeof BodyPartEnum>
export type Category = z.infer<typeof CategoryEnum>
export type SetType = z.infer<typeof SetTypeEnum>
```

- [ ] **Step 2: Epley 유틸**

```typescript
// lib/utils/workout-1rm.ts
/** Epley 공식: weight × (1 + reps/30). weight 또는 reps 없으면 null. */
export function estimated1RM(weight: number | null, reps: number | null): number | null {
  if (weight == null || reps == null || reps <= 0) return null
  return Number((weight * (1 + reps / 30)).toFixed(2))
}
```

- [ ] **Step 3: 포맷 유틸**

```typescript
// lib/utils/workout-format.ts
export function formatDuration(minutes: number | null): string {
  if (minutes == null) return "-"
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`
}

export function formatWeight(kg: number | null): string {
  if (kg == null) return "-"
  return `${kg.toLocaleString("ko-KR", { maximumFractionDigits: 1 })} kg`
}

export function formatSetLine(weight: number | null, reps: number | null): string {
  if (weight == null && reps == null) return "-"
  if (weight == null) return `${reps} 렙`
  if (reps == null) return formatWeight(weight)
  return `${formatWeight(weight)} × ${reps}`
}
```

- [ ] **Step 4: 타입체크 + 커밋**

```bash
pnpm exec tsc --noEmit
git add lib/validators/workout.ts lib/utils/workout-1rm.ts lib/utils/workout-format.ts
git commit -m "feat(workout): Zod 검증 스키마 + Epley/포맷 유틸"
```

---

## Task 3: Server Actions — workout-exercises.ts

**Files:**
- Create: `lib/actions/workout-exercises.ts`

- [ ] **Step 1: 작성**

```typescript
"use server"

import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { ExerciseInputSchema } from "@/lib/validators/workout"

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string }

export async function createExercise(input: z.infer<typeof ExerciseInputSchema>): Promise<Result<{ id: string }>> {
  const parsed = ExerciseInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "로그인 필요" }

  const { data, error } = await supabase
    .from("workout_exercises")
    .insert({ user_id: user.id, ...parsed.data })
    .select("id")
    .single()

  if (error) return { ok: false, error: error.message }
  revalidatePath("/workout/exercises")
  revalidatePath("/workout/templates")
  return { ok: true, data: { id: data.id } }
}

export async function updateExercise(
  id: string,
  patch: Partial<z.infer<typeof ExerciseInputSchema>>
): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from("workout_exercises").update(patch).eq("id", id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/workout/exercises")
  revalidatePath("/workout/templates")
  return { ok: true }
}

export async function deleteExercise(id: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from("workout_exercises").delete().eq("id", id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/workout/exercises")
  return { ok: true }
}
```

- [ ] **Step 2: 타입체크 + 커밋**

```bash
pnpm exec tsc --noEmit
git add lib/actions/workout-exercises.ts
git commit -m "feat(workout): server action — workout-exercises (CRUD)"
```

---

## Task 4: Server Actions — workout-templates.ts

**Files:**
- Create: `lib/actions/workout-templates.ts`

- [ ] **Step 1: 작성**

```typescript
"use server"

import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { FolderInputSchema, RoutineInputSchema, RoutineExerciseInputSchema } from "@/lib/validators/workout"

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string }

export async function createFolder(input: z.infer<typeof FolderInputSchema>): Promise<Result<{ id: string }>> {
  const parsed = FolderInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "로그인 필요" }
  const { data, error } = await supabase
    .from("workout_template_folders")
    .insert({ user_id: user.id, name: parsed.data.name })
    .select("id")
    .single()
  if (error) return { ok: false, error: error.message }
  revalidatePath("/workout/templates")
  revalidatePath("/workout/start")
  return { ok: true, data: { id: data.id } }
}

export async function deleteFolder(id: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from("workout_template_folders").delete().eq("id", id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/workout/templates")
  revalidatePath("/workout/start")
  return { ok: true }
}

export async function createRoutine(input: z.infer<typeof RoutineInputSchema>): Promise<Result<{ id: string }>> {
  const parsed = RoutineInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "로그인 필요" }
  const { data, error } = await supabase
    .from("workout_routines")
    .insert({ user_id: user.id, folder_id: parsed.data.folder_id, name: parsed.data.name })
    .select("id")
    .single()
  if (error) return { ok: false, error: error.message }
  revalidatePath("/workout/templates")
  revalidatePath("/workout/start")
  return { ok: true, data: { id: data.id } }
}

export async function deleteRoutine(id: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from("workout_routines").delete().eq("id", id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/workout/templates")
  revalidatePath("/workout/start")
  return { ok: true }
}

export async function addRoutineExercise(input: z.infer<typeof RoutineExerciseInputSchema>): Promise<Result> {
  const parsed = RoutineExerciseInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }
  const supabase = await createClient()
  // 다음 sort_order 계산
  const { data: max } = await supabase
    .from("workout_routine_exercises")
    .select("sort_order")
    .eq("routine_id", parsed.data.routine_id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle()
  const next = (max?.sort_order ?? -1) + 1
  const { error } = await supabase.from("workout_routine_exercises").insert({
    routine_id: parsed.data.routine_id,
    exercise_id: parsed.data.exercise_id,
    default_sets: parsed.data.default_sets,
    sort_order: next,
  })
  if (error) return { ok: false, error: error.message }
  revalidatePath("/workout/templates")
  return { ok: true }
}

export async function removeRoutineExercise(id: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from("workout_routine_exercises").delete().eq("id", id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/workout/templates")
  return { ok: true }
}
```

- [ ] **Step 2: 타입체크 + 커밋**

```bash
pnpm exec tsc --noEmit
git add lib/actions/workout-templates.ts
git commit -m "feat(workout): server action — workout-templates (폴더+루틴+루틴운동 CRUD)"
```

---

## Task 5: Server Actions — workout-sessions.ts

**Files:**
- Create: `lib/actions/workout-sessions.ts`

- [ ] **Step 1: 작성**

```typescript
"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string }

/** 빈 워크아웃 세션 시작 → 세션 id 반환 */
export async function startEmptySession(): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "로그인 필요" }
  const { data, error } = await supabase
    .from("workout_sessions")
    .insert({ user_id: user.id })
    .select("id")
    .single()
  if (error) return { error: error.message }
  return { id: data.id }
}

/** 루틴 기반 세션 시작 → 루틴 운동을 session_exercises에 복사 */
export async function startSessionFromRoutine(routine_id: string): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "로그인 필요" }

  // 루틴 정보 + 폴더명 조회
  const { data: routine, error: rErr } = await supabase
    .from("workout_routines")
    .select("id, name, folder_id, workout_template_folders!inner(name)")
    .eq("id", routine_id)
    .maybeSingle()
  if (rErr || !routine) return { error: rErr?.message ?? "루틴 없음" }

  // 폴더명은 left join 결과의 첫번째
  const folderName = (routine as unknown as { workout_template_folders: { name: string } | null }).workout_template_folders?.name ?? null

  // 세션 생성
  const { data: session, error: sErr } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: user.id,
      routine_id: routine.id,
      routine_name: routine.name,
      folder_name: folderName,
    })
    .select("id")
    .single()
  if (sErr) return { error: sErr.message }

  // 루틴 운동들 복사
  const { data: routineExs } = await supabase
    .from("workout_routine_exercises")
    .select("exercise_id, default_sets, sort_order, workout_exercises!inner(name, body_part, category)")
    .eq("routine_id", routine_id)
    .order("sort_order", { ascending: true })

  if (routineExs && routineExs.length > 0) {
    const sessionExRows = routineExs.map((re) => {
      const ex = (re as unknown as { workout_exercises: { name: string; body_part: string; category: string } }).workout_exercises
      return {
        session_id: session.id,
        exercise_id: re.exercise_id,
        exercise_name: ex.name,
        body_part: ex.body_part,
        category: ex.category,
        sort_order: re.sort_order,
      }
    })
    const { data: insertedSE, error: seErr } = await supabase
      .from("workout_session_exercises")
      .insert(sessionExRows)
      .select("id, sort_order")
    if (seErr) return { error: seErr.message }

    // 각 운동에 default_sets개 빈 세트 생성
    const setRows: Array<{
      session_exercise_id: string
      set_number: number
      set_type: "working"
      sort_order: number
    }> = []
    insertedSE?.forEach((se) => {
      const defaultSets = routineExs[se.sort_order]?.default_sets ?? 3
      for (let i = 0; i < defaultSets; i++) {
        setRows.push({
          session_exercise_id: se.id,
          set_number: i + 1,
          set_type: "working",
          sort_order: i,
        })
      }
    })
    if (setRows.length > 0) {
      await supabase.from("workout_sets").insert(setRows)
    }
  }

  return { id: session.id }
}

/** 세션에 운동 추가 (빈 워크아웃에서) */
export async function addExerciseToSession(
  session_id: string,
  exercise_id: string
): Promise<Result<{ session_exercise_id: string }>> {
  const supabase = await createClient()

  const { data: ex } = await supabase
    .from("workout_exercises")
    .select("name, body_part, category")
    .eq("id", exercise_id)
    .maybeSingle()
  if (!ex) return { ok: false, error: "운동 없음" }

  const { data: max } = await supabase
    .from("workout_session_exercises")
    .select("sort_order")
    .eq("session_id", session_id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle()
  const next = (max?.sort_order ?? -1) + 1

  const { data: insertedSE, error: seErr } = await supabase
    .from("workout_session_exercises")
    .insert({
      session_id,
      exercise_id,
      exercise_name: ex.name,
      body_part: ex.body_part,
      category: ex.category,
      sort_order: next,
    })
    .select("id")
    .single()
  if (seErr) return { ok: false, error: seErr.message }

  // 기본 working 세트 1개
  await supabase.from("workout_sets").insert({
    session_exercise_id: insertedSE.id,
    set_number: 1,
    set_type: "working",
    sort_order: 0,
  })

  revalidatePath(`/workout/session/${session_id}`)
  return { ok: true, data: { session_exercise_id: insertedSE.id } }
}

export async function removeExerciseFromSession(session_exercise_id: string, session_id: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from("workout_session_exercises").delete().eq("id", session_exercise_id)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/workout/session/${session_id}`)
  return { ok: true }
}

/** 세션 완료 (ended_at 채움 → 트리거가 duration 계산) */
export async function finishSession(session_id: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("workout_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", session_id)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/workout/session/${session_id}`)
  return { ok: true }
}

export async function deleteSession(session_id: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from("workout_sessions").delete().eq("id", session_id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/workout/start")
  return { ok: true }
}
```

- [ ] **Step 2: 타입체크 + 커밋**

```bash
pnpm exec tsc --noEmit
git add lib/actions/workout-sessions.ts
git commit -m "feat(workout): server action — workout-sessions (start/finish/add 운동)"
```

---

## Task 6: Server Actions — workout-sets.ts

**Files:**
- Create: `lib/actions/workout-sets.ts`

- [ ] **Step 1: 작성**

```typescript
"use server"

import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { SetInputSchema, SetTypeEnum } from "@/lib/validators/workout"

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string }

export async function addSet(session_exercise_id: string, session_id: string): Promise<Result<{ id: string }>> {
  const supabase = await createClient()
  // 다음 set_number와 sort_order
  const { data: existing } = await supabase
    .from("workout_sets")
    .select("set_number, sort_order")
    .eq("session_exercise_id", session_exercise_id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextNum = (existing?.set_number ?? 0) + 1
  const nextOrder = (existing?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from("workout_sets")
    .insert({
      session_exercise_id,
      set_number: nextNum,
      set_type: "working",
      sort_order: nextOrder,
    })
    .select("id")
    .single()
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/workout/session/${session_id}`)
  return { ok: true, data: { id: data.id } }
}

const UpdateSetSchema = z.object({
  weight_kg: z.number().nullable().optional(),
  reps: z.number().int().min(0).nullable().optional(),
  set_type: SetTypeEnum.optional(),
  completed: z.boolean().optional(),
})

export async function updateSet(
  id: string,
  session_id: string,
  patch: z.infer<typeof UpdateSetSchema>
): Promise<Result> {
  const parsed = UpdateSetSchema.safeParse(patch)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }
  const supabase = await createClient()
  const { error } = await supabase.from("workout_sets").update(parsed.data).eq("id", id)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/workout/session/${session_id}`)
  return { ok: true }
}

export async function deleteSet(id: string, session_id: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from("workout_sets").delete().eq("id", id)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/workout/session/${session_id}`)
  return { ok: true }
}

/**
 * 같은 운동·같은 set_number의 가장 최근 완료 세트 (직전 기록).
 * 세션 화면 "이전" 컬럼용. 현재 세션은 제외.
 */
export async function findPreviousSet(
  exercise_name: string,
  set_number: number,
  current_session_id: string
): Promise<{ weight_kg: number | null; reps: number | null } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from("workout_sets")
    .select(`
      weight_kg, reps,
      workout_session_exercises!inner (
        exercise_name,
        workout_sessions!inner ( id, started_at, user_id )
      )
    `)
    .eq("set_number", set_number)
    .eq("completed", true)
    .eq("workout_session_exercises.exercise_name", exercise_name)
    .eq("workout_session_exercises.workout_sessions.user_id", user.id)
    .neq("workout_session_exercises.workout_sessions.id", current_session_id)
    .order("workout_session_exercises(workout_sessions(started_at))", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null
  return { weight_kg: data.weight_kg, reps: data.reps }
}
```

- [ ] **Step 2: 타입체크 + 커밋**

```bash
pnpm exec tsc --noEmit
git add lib/actions/workout-sets.ts
git commit -m "feat(workout): server action — workout-sets (CRUD + 직전 기록 조회)"
```

---

## Task 7: /workout 라우트 — layout + redirect

**Files:**
- Modify: `app/workout/page.tsx`
- Create: `app/workout/layout.tsx`
- Create: `app/workout/start/page.tsx` (placeholder, Task 8에서 채움)

- [ ] **Step 1: layout 작성 (사이드바 자리)**

```typescript
// app/workout/layout.tsx
import { WorkoutSidebar } from "@/components/workout/sidebar/WorkoutSidebar"

export default function WorkoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <WorkoutSidebar />
      <main className="min-h-screen flex-1 md:ml-0">{children}</main>
    </div>
  )
}
```

- [ ] **Step 2: /workout → /workout/start redirect**

```typescript
// app/workout/page.tsx
import { redirect } from "next/navigation"

export default function WorkoutPage() {
  redirect("/workout/start")
}
```

- [ ] **Step 3: /workout/start placeholder**

```typescript
// app/workout/start/page.tsx
export default function StartPage() {
  return <div className="p-8">시작 화면 (Task 8)</div>
}
```

- [ ] **Step 4: 사이드바 placeholder (Task 12에서 진짜 채움)**

```typescript
// components/workout/sidebar/WorkoutSidebar.tsx
export function WorkoutSidebar() {
  return (
    <aside className="hidden md:block w-56 border-r border-neutral-200 bg-white">
      <div className="p-4 text-sm text-neutral-500">사이드바 (Task 12)</div>
    </aside>
  )
}
```

- [ ] **Step 5: 타입체크 + 커밋**

```bash
pnpm exec tsc --noEmit
git add app/workout/layout.tsx app/workout/page.tsx app/workout/start/page.tsx components/workout/sidebar/WorkoutSidebar.tsx
git commit -m "feat(workout): /workout → /workout/start redirect + layout 골격"
```

---

## Task 8: /workout/start — 빈 워크아웃 + 템플릿 폴더 트리

**Files:**
- Modify: `app/workout/start/page.tsx`
- Create: `components/workout/start/EmptyWorkoutButton.tsx`
- Create: `components/workout/start/TemplateFolderList.tsx`
- Create: `components/workout/start/RoutineCard.tsx`

- [ ] **Step 1: 빈 워크아웃 버튼 (Client component, server action 호출)**

```typescript
"use client"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { startEmptySession } from "@/lib/actions/workout-sessions"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function EmptyWorkoutButton() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const onClick = () =>
    start(async () => {
      const result = await startEmptySession()
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      router.push(`/workout/session/${result.id}`)
    })
  return (
    <Button
      onClick={onClick}
      disabled={pending}
      className="h-14 w-full bg-blue-600 text-base font-semibold hover:bg-blue-700"
    >
      {pending ? "시작 중..." : "+ 빈 워크아웃 시작"}
    </Button>
  )
}
```

- [ ] **Step 2: 루틴 카드 (시작 버튼)**

```typescript
"use client"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { startSessionFromRoutine } from "@/lib/actions/workout-sessions"
import { toast } from "sonner"

export function RoutineCard({ routine }: { routine: { id: string; name: string; exerciseCount: number } }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const onClick = () =>
    start(async () => {
      const result = await startSessionFromRoutine(routine.id)
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      router.push(`/workout/session/${result.id}`)
    })
  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="flex w-full items-center justify-between rounded border border-neutral-200 bg-white p-3 text-left transition-colors hover:bg-neutral-50 disabled:opacity-60"
    >
      <div>
        <div className="text-sm font-medium">{routine.name}</div>
        <div className="text-xs text-neutral-500">{routine.exerciseCount}개 운동</div>
      </div>
      <span className="text-blue-600">▶</span>
    </button>
  )
}
```

- [ ] **Step 3: 템플릿 폴더 리스트 (Server)**

```typescript
// components/workout/start/TemplateFolderList.tsx
import { createClient } from "@/lib/supabase/server"
import { RoutineCard } from "./RoutineCard"

export async function TemplateFolderList() {
  const supabase = await createClient()
  const { data: folders } = await supabase
    .from("workout_template_folders")
    .select("id, name, sort_order")
    .order("sort_order", { ascending: true })

  const { data: routines } = await supabase
    .from("workout_routines")
    .select("id, name, folder_id, sort_order")
    .order("sort_order", { ascending: true })

  const { data: rxn } = await supabase
    .from("workout_routine_exercises")
    .select("routine_id")

  const exerciseCount = new Map<string, number>()
  for (const r of rxn ?? []) {
    exerciseCount.set(r.routine_id, (exerciseCount.get(r.routine_id) ?? 0) + 1)
  }

  if (!folders || folders.length === 0) {
    return (
      <div className="rounded border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
        템플릿 폴더가 없습니다. <a href="/workout/templates" className="text-blue-600 underline">템플릿 만들기</a>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {folders.map((folder) => {
        const folderRoutines = (routines ?? []).filter((r) => r.folder_id === folder.id)
        return (
          <div key={folder.id}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {folder.name} ({folderRoutines.length})
            </h3>
            <div className="space-y-1.5">
              {folderRoutines.map((r) => (
                <RoutineCard
                  key={r.id}
                  routine={{ id: r.id, name: r.name, exerciseCount: exerciseCount.get(r.id) ?? 0 }}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: /workout/start page**

```typescript
// app/workout/start/page.tsx
import { EmptyWorkoutButton } from "@/components/workout/start/EmptyWorkoutButton"
import { TemplateFolderList } from "@/components/workout/start/TemplateFolderList"

export default function StartPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      <h1 className="text-xl font-bold md:text-2xl">💪 워크아웃 시작</h1>
      <EmptyWorkoutButton />
      <div>
        <h2 className="mb-3 text-base font-semibold">📋 템플릿</h2>
        <TemplateFolderList />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: 타입체크 + 커밋**

```bash
pnpm exec tsc --noEmit
git add app/workout/start/page.tsx components/workout/start/
git commit -m "feat(workout): /workout/start — 빈 워크아웃 + 템플릿 폴더 트리"
```

---

## Task 9: /workout/exercises — 운동 종목 CRUD

**Files:**
- Create: `app/workout/exercises/page.tsx`
- Create: `components/workout/exercises/ExerciseList.tsx`
- Create: `components/workout/exercises/ExerciseRow.tsx`
- Create: `components/workout/exercises/NewExerciseDialog.tsx`

- [ ] **Step 1: NewExerciseDialog (10개 부위 칩 + 카테고리 select)**

```typescript
"use client"
import { useState, useTransition } from "react"
import { Dialog } from "@base-ui-components/react/dialog"
import { createExercise } from "@/lib/actions/workout-exercises"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { BodyPart, Category } from "@/lib/validators/workout"

const BODY_PARTS: BodyPart[] = ["Arms","Back","Cardio","Chest","Core","Full Body","Legs","Olympic","Other","Shoulders"]
const CATEGORIES: Category[] = ["Barbell","Dumbbell","Machine","Cable","Bodyweight","Assisted Bodyweight","Reps Only","Cardio","Duration","Other"]

export function NewExerciseDialog({
  trigger,
  onCreated,
}: {
  trigger: React.ReactNode
  onCreated?: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [bodyPart, setBodyPart] = useState<BodyPart | "">("")
  const [category, setCategory] = useState<Category | "">("")
  const [pending, start] = useTransition()

  const onSave = () => {
    if (!name.trim() || !bodyPart || !category) {
      toast.error("이름·부위·카테고리 모두 입력")
      return
    }
    start(async () => {
      const r = await createExercise({ name: name.trim(), body_part: bodyPart, category })
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success("운동 추가됨")
      setName(""); setBodyPart(""); setCategory("")
      setOpen(false)
      onCreated?.(r.data!.id)
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger render={trigger as React.ReactElement} />
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/40" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 w-[min(420px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded bg-white p-4 shadow-lg">
          <Dialog.Title className="text-base font-semibold">새 운동 만들기</Dialog.Title>
          <div className="mt-3 space-y-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름 (예: Bench Press)" />
            <div>
              <div className="mb-1 text-xs text-neutral-500">부위</div>
              <div className="flex flex-wrap gap-1.5">
                {BODY_PARTS.map((bp) => (
                  <button
                    key={bp}
                    type="button"
                    onClick={() => setBodyPart(bp)}
                    className={cn(
                      "rounded border px-2 py-1 text-xs",
                      bodyPart === bp ? "border-blue-600 bg-blue-50 text-blue-700" : "border-neutral-200 text-neutral-600"
                    )}
                  >{bp}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1 text-xs text-neutral-500">카테고리</div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
              >
                <option value="">선택...</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>취소</Button>
            <Button size="sm" onClick={onSave} disabled={pending}>{pending ? "저장 중..." : "저장"}</Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

- [ ] **Step 2: ExerciseRow + ExerciseList + page**

```typescript
// components/workout/exercises/ExerciseRow.tsx
"use client"
import { useTransition } from "react"
import { deleteExercise } from "@/lib/actions/workout-exercises"
import { toast } from "sonner"

export function ExerciseRow({ ex }: { ex: { id: string; name: string; body_part: string; category: string } }) {
  const [pending, start] = useTransition()
  const onDelete = () => {
    if (!confirm(`"${ex.name}" 삭제? 이 종목을 포함한 루틴·세션 기록은 보존됨.`)) return
    start(async () => {
      const r = await deleteExercise(ex.id)
      if (!r.ok) toast.error(r.error)
      else toast.success("삭제됨")
    })
  }
  return (
    <li className="flex items-center justify-between rounded border border-neutral-200 bg-white px-3 py-2">
      <div>
        <div className="text-sm font-medium">{ex.name}</div>
        <div className="text-xs text-neutral-500">{ex.body_part} · {ex.category}</div>
      </div>
      <button onClick={onDelete} disabled={pending} className="text-xs text-red-600 hover:underline">삭제</button>
    </li>
  )
}
```

```typescript
// components/workout/exercises/ExerciseList.tsx
import { createClient } from "@/lib/supabase/server"
import { ExerciseRow } from "./ExerciseRow"
import { NewExerciseDialog } from "./NewExerciseDialog"
import { Button } from "@/components/ui/button"

export async function ExerciseList() {
  const supabase = await createClient()
  const { data: rows } = await supabase
    .from("workout_exercises")
    .select("id, name, body_part, category")
    .order("body_part", { ascending: true })
    .order("name", { ascending: true })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold md:text-2xl">🏋️ 운동 종목</h1>
        <NewExerciseDialog trigger={<Button size="sm">+ 새 운동</Button>} />
      </div>
      {!rows || rows.length === 0 ? (
        <p className="rounded border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
          등록된 운동이 없습니다.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((ex) => <ExerciseRow key={ex.id} ex={ex} />)}
        </ul>
      )}
    </div>
  )
}
```

```typescript
// app/workout/exercises/page.tsx
import { ExerciseList } from "@/components/workout/exercises/ExerciseList"

export default function Page() {
  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6">
      <ExerciseList />
    </div>
  )
}
```

- [ ] **Step 3: 타입체크 + 커밋**

```bash
pnpm exec tsc --noEmit
git add app/workout/exercises/ components/workout/exercises/
git commit -m "feat(workout): /workout/exercises — 운동 종목 CRUD"
```

---

## Task 10: /workout/templates — 폴더+루틴 인라인 편집

**Files:**
- Create: `app/workout/templates/page.tsx`
- Create: `components/workout/templates/FolderEditor.tsx`
- Create: `components/workout/templates/RoutineEditor.tsx`

- [ ] **Step 1: RoutineEditor (루틴 운동 추가/삭제)**

```typescript
"use client"
import { useState, useTransition } from "react"
import {
  addRoutineExercise,
  removeRoutineExercise,
  deleteRoutine,
} from "@/lib/actions/workout-templates"
import { toast } from "sonner"

export type RoutineExerciseRow = {
  id: string
  exercise_id: string
  exercise_name: string
  default_sets: number
}

export function RoutineEditor({
  routine,
  exercises,
  routineExercises,
}: {
  routine: { id: string; name: string }
  exercises: Array<{ id: string; name: string }>
  routineExercises: RoutineExerciseRow[]
}) {
  const [pickerExId, setPickerExId] = useState("")
  const [pickerSets, setPickerSets] = useState(3)
  const [pending, start] = useTransition()

  const onAdd = () => {
    if (!pickerExId) {
      toast.error("운동 선택")
      return
    }
    start(async () => {
      const r = await addRoutineExercise({
        routine_id: routine.id,
        exercise_id: pickerExId,
        default_sets: pickerSets,
      })
      if (!r.ok) toast.error(r.error)
      else { setPickerExId(""); setPickerSets(3) }
    })
  }

  const onRemove = (id: string) =>
    start(async () => {
      const r = await removeRoutineExercise(id)
      if (!r.ok) toast.error(r.error)
    })

  const onDelete = () => {
    if (!confirm(`루틴 "${routine.name}" 삭제? (운동 종목은 보존됨)`)) return
    start(async () => {
      const r = await deleteRoutine(routine.id)
      if (!r.ok) toast.error(r.error)
    })
  }

  return (
    <div className="space-y-2 rounded border border-neutral-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{routine.name}</h4>
        <button onClick={onDelete} disabled={pending} className="text-xs text-red-600 hover:underline">루틴 삭제</button>
      </div>
      <ul className="space-y-1">
        {routineExercises.map((re) => (
          <li key={re.id} className="flex items-center justify-between rounded bg-neutral-50 px-2 py-1 text-xs">
            <span>{re.exercise_name} <span className="text-neutral-400">×{re.default_sets}세트</span></span>
            <button onClick={() => onRemove(re.id)} disabled={pending} className="text-red-600 hover:underline">×</button>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-1.5">
        <select
          value={pickerExId}
          onChange={(e) => setPickerExId(e.target.value)}
          className="flex-1 rounded border border-neutral-300 px-1.5 py-1 text-xs"
        >
          <option value="">운동 선택...</option>
          {exercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
        </select>
        <input
          type="number"
          value={pickerSets}
          onChange={(e) => setPickerSets(Number(e.target.value))}
          min={1} max={20}
          className="w-12 rounded border border-neutral-300 px-1 py-1 text-xs"
        />
        <button
          onClick={onAdd}
          disabled={pending}
          className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-60"
        >+ 추가</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: FolderEditor**

```typescript
"use client"
import { useState, useTransition } from "react"
import { createRoutine, deleteFolder } from "@/lib/actions/workout-templates"
import { RoutineEditor, type RoutineExerciseRow } from "./RoutineEditor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

export function FolderEditor({
  folder,
  routines,
  exercises,
  routineExercisesByRoutine,
}: {
  folder: { id: string; name: string }
  routines: Array<{ id: string; name: string }>
  exercises: Array<{ id: string; name: string }>
  routineExercisesByRoutine: Record<string, RoutineExerciseRow[]>
}) {
  const [newRoutineName, setNewRoutineName] = useState("")
  const [pending, start] = useTransition()

  const onAddRoutine = () => {
    if (!newRoutineName.trim()) { toast.error("이름 입력"); return }
    start(async () => {
      const r = await createRoutine({ name: newRoutineName.trim(), folder_id: folder.id })
      if (!r.ok) toast.error(r.error)
      else setNewRoutineName("")
    })
  }

  const onDeleteFolder = () => {
    if (!confirm(`폴더 "${folder.name}" 삭제? (안에 있는 루틴들의 folder_id가 null로 됨)`)) return
    start(async () => {
      const r = await deleteFolder(folder.id)
      if (!r.ok) toast.error(r.error)
    })
  }

  return (
    <section className="rounded border border-neutral-200 bg-neutral-50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">📁 {folder.name}</h3>
        <button onClick={onDeleteFolder} className="text-xs text-red-600 hover:underline">폴더 삭제</button>
      </div>
      <div className="space-y-2">
        {routines.map((r) => (
          <RoutineEditor
            key={r.id}
            routine={r}
            exercises={exercises}
            routineExercises={routineExercisesByRoutine[r.id] ?? []}
          />
        ))}
      </div>
      <div className="mt-2 flex gap-1.5">
        <Input
          value={newRoutineName}
          onChange={(e) => setNewRoutineName(e.target.value)}
          placeholder="새 루틴 이름"
          className="h-8 text-xs"
        />
        <Button size="sm" onClick={onAddRoutine} disabled={pending}>+ 루틴</Button>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: templates page (server)**

```typescript
// app/workout/templates/page.tsx
"use server"
import { createClient } from "@/lib/supabase/server"
import { FolderEditor } from "@/components/workout/templates/FolderEditor"
import { createFolder } from "@/lib/actions/workout-templates"
import type { RoutineExerciseRow } from "@/components/workout/templates/RoutineEditor"

async function NewFolderForm() {
  return (
    <form
      action={async (formData) => {
        "use server"
        const name = String(formData.get("name") ?? "").trim()
        if (!name) return
        await createFolder({ name })
      }}
      className="flex gap-1.5"
    >
      <input
        name="name"
        placeholder="새 폴더 이름"
        className="flex-1 rounded border border-neutral-300 px-2 py-1.5 text-sm"
      />
      <button className="rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700">+ 폴더</button>
    </form>
  )
}

export default async function Page() {
  const supabase = await createClient()
  const [foldersRes, routinesRes, exercisesRes, rxnRes] = await Promise.all([
    supabase.from("workout_template_folders").select("id, name").order("sort_order", { ascending: true }),
    supabase.from("workout_routines").select("id, name, folder_id").order("sort_order", { ascending: true }),
    supabase.from("workout_exercises").select("id, name").order("name", { ascending: true }),
    supabase
      .from("workout_routine_exercises")
      .select("id, routine_id, exercise_id, default_sets, sort_order, workout_exercises!inner(name)")
      .order("sort_order", { ascending: true }),
  ])

  const folders = foldersRes.data ?? []
  const routines = routinesRes.data ?? []
  const exercises = exercisesRes.data ?? []
  const rxn = rxnRes.data ?? []

  const routineExercisesByRoutine: Record<string, RoutineExerciseRow[]> = {}
  for (const r of rxn) {
    const exName = (r as unknown as { workout_exercises: { name: string } }).workout_exercises.name
    if (!routineExercisesByRoutine[r.routine_id]) routineExercisesByRoutine[r.routine_id] = []
    routineExercisesByRoutine[r.routine_id].push({
      id: r.id,
      exercise_id: r.exercise_id,
      exercise_name: exName,
      default_sets: r.default_sets,
    })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <h1 className="text-xl font-bold md:text-2xl">📋 템플릿</h1>
      <NewFolderForm />
      {folders.length === 0 ? (
        <p className="rounded border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
          폴더가 없습니다.
        </p>
      ) : (
        <div className="space-y-3">
          {folders.map((f) => (
            <FolderEditor
              key={f.id}
              folder={f}
              routines={routines.filter((r) => r.folder_id === f.id)}
              exercises={exercises}
              routineExercisesByRoutine={routineExercisesByRoutine}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: 타입체크 + 커밋**

```bash
pnpm exec tsc --noEmit
git add app/workout/templates/ components/workout/templates/
git commit -m "feat(workout): /workout/templates — 폴더+루틴+루틴운동 인라인 편집"
```

---

## Task 11: /workout/session/[id] — 세션 화면 골격 + 운동 추가 시트

**Files:**
- Create: `app/workout/session/[id]/page.tsx`
- Create: `components/workout/session/SessionHeader.tsx`
- Create: `components/workout/session/ExerciseBlock.tsx`
- Create: `components/workout/session/AddExerciseSheet.tsx`
- Create: `components/workout/session/FinishButton.tsx`

- [ ] **Step 1: SessionHeader (제목 + 날짜 + 경과시간)**

```typescript
"use client"
import { useEffect, useState } from "react"

export function SessionHeader({
  title,
  date,
  startedAt,
}: {
  title: string
  date: string
  startedAt: string
}) {
  const [elapsed, setElapsed] = useState("")
  useEffect(() => {
    const update = () => {
      const ms = Date.now() - new Date(startedAt).getTime()
      const totalSec = Math.max(0, Math.floor(ms / 1000))
      const h = Math.floor(totalSec / 3600)
      const m = Math.floor((totalSec % 3600) / 60)
      const s = totalSec % 60
      setElapsed(h > 0 ? `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}` : `${m}:${String(s).padStart(2,"0")}`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [startedAt])

  return (
    <div>
      <h1 className="text-lg font-bold">{title}</h1>
      <p className="text-xs text-neutral-500">📅 {date} · 🕐 {elapsed}</p>
    </div>
  )
}
```

- [ ] **Step 2: AddExerciseSheet (vaul Drawer + 운동 검색 + 새 운동 다이얼로그)**

```typescript
"use client"
import { useState, useTransition } from "react"
import { Drawer } from "vaul"
import { addExerciseToSession } from "@/lib/actions/workout-sessions"
import { NewExerciseDialog } from "@/components/workout/exercises/NewExerciseDialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

export function AddExerciseSheet({
  sessionId,
  allExercises,
}: {
  sessionId: string
  allExercises: Array<{ id: string; name: string; body_part: string }>
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const [pending, start] = useTransition()

  const filtered = allExercises.filter((ex) =>
    ex.name.toLowerCase().includes(q.toLowerCase())
  )

  const onPick = (exerciseId: string) =>
    start(async () => {
      const r = await addExerciseToSession(sessionId, exerciseId)
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success("운동 추가됨")
      setOpen(false)
      setQ("")
    })

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        <Button variant="outline" className="w-full">+ 운동 추가</Button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 mt-24 flex max-h-[85vh] flex-col rounded-t-lg bg-white p-4">
          <Drawer.Title className="mb-2 text-base font-semibold">운동 추가</Drawer.Title>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="검색..."
            className="mb-3"
          />
          <div className="flex-1 overflow-y-auto">
            <ul className="space-y-1">
              {filtered.map((ex) => (
                <li key={ex.id}>
                  <button
                    onClick={() => onPick(ex.id)}
                    disabled={pending}
                    className="flex w-full items-center justify-between rounded border border-neutral-200 px-3 py-2 text-left text-sm hover:bg-neutral-50 disabled:opacity-60"
                  >
                    <span>{ex.name}</span>
                    <span className="text-xs text-neutral-400">{ex.body_part}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <NewExerciseDialog
            trigger={<Button variant="outline" className="mt-3 w-full">+ 새 운동 만들기</Button>}
            onCreated={(id) => onPick(id)}
          />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
```

- [ ] **Step 3: FinishButton**

```typescript
"use client"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { finishSession } from "@/lib/actions/workout-sessions"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function FinishButton({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const onClick = () =>
    start(async () => {
      if (!confirm("운동을 완료하시겠습니까?")) return
      const r = await finishSession(sessionId)
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      router.push(`/workout/session/${sessionId}/complete`)
    })
  return (
    <Button onClick={onClick} disabled={pending} className="bg-green-600 hover:bg-green-700">
      {pending ? "완료 중..." : "완료"}
    </Button>
  )
}
```

- [ ] **Step 4: page.tsx (Task 12에서 ExerciseBlock·SetRow 추가)**

```typescript
import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { SessionHeader } from "@/components/workout/session/SessionHeader"
import { AddExerciseSheet } from "@/components/workout/session/AddExerciseSheet"
import { FinishButton } from "@/components/workout/session/FinishButton"
import { ExerciseBlock } from "@/components/workout/session/ExerciseBlock"

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: session } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (!session) notFound()

  const { data: sessionExs } = await supabase
    .from("workout_session_exercises")
    .select("id, exercise_name, body_part, category, sort_order")
    .eq("session_id", id)
    .order("sort_order", { ascending: true })

  const { data: allSets } = await supabase
    .from("workout_sets")
    .select("id, session_exercise_id, set_number, set_type, weight_kg, reps, completed, sort_order")
    .in("session_exercise_id", (sessionExs ?? []).map((se) => se.id))
    .order("sort_order", { ascending: true })

  const { data: allExercises } = await supabase
    .from("workout_exercises")
    .select("id, name, body_part")
    .order("body_part")
    .order("name")

  const setsByExercise = new Map<string, NonNullable<typeof allSets>>()
  for (const s of allSets ?? []) {
    if (!setsByExercise.has(s.session_exercise_id)) setsByExercise.set(s.session_exercise_id, [])
    setsByExercise.get(s.session_exercise_id)!.push(s)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <div className="flex items-start justify-between">
        <SessionHeader
          title={session.routine_name ?? "빈 워크아웃"}
          date={session.date}
          startedAt={session.started_at}
        />
        <FinishButton sessionId={session.id} />
      </div>
      <div className="space-y-3">
        {(sessionExs ?? []).map((se) => (
          <ExerciseBlock
            key={se.id}
            sessionExercise={se}
            sets={setsByExercise.get(se.id) ?? []}
            sessionId={session.id}
          />
        ))}
      </div>
      <AddExerciseSheet sessionId={session.id} allExercises={allExercises ?? []} />
    </div>
  )
}
```

- [ ] **Step 5: 타입체크 + 커밋 (Task 12에서 ExerciseBlock 추가 후 빌드 통과)**

```bash
# ExerciseBlock 미구현이라 이 커밋은 Task 12와 합칠 수도 있음.
# 안전하게 Task 12까지 작업 후 한 번에 커밋.
echo "ExerciseBlock 구현 후 커밋 — Task 12로 이동"
```

---

## Task 12: 세션 화면 — ExerciseBlock + SetRow + SetTypePicker

**Files:**
- Create: `components/workout/session/SetTypePicker.tsx`
- Create: `components/workout/session/SetRow.tsx`
- Create: `components/workout/session/ExerciseBlock.tsx`

- [ ] **Step 1: SetTypePicker (popover로 W/숫자/F 변경)**

```typescript
"use client"
import { useState } from "react"
import { cn } from "@/lib/utils"
import type { SetType } from "@/lib/validators/workout"

const TYPES: Array<{ key: SetType; label: string; cls: string }> = [
  { key: "warmup",  label: "W", cls: "bg-orange-500 text-white" },
  { key: "working", label: "본",  cls: "bg-neutral-700 text-white" },
  { key: "failure", label: "F", cls: "bg-red-600 text-white" },
]

export function SetTypePicker({
  current,
  setNumber,
  onChange,
}: {
  current: SetType
  setNumber: number
  onChange: (next: SetType) => void
}) {
  const [open, setOpen] = useState(false)
  const currentT = TYPES.find((t) => t.key === current) ?? TYPES[1]
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded text-xs font-bold",
          current === "warmup" && "bg-orange-500 text-white",
          current === "failure" && "bg-red-600 text-white",
          current === "working" && "bg-neutral-100 text-neutral-700"
        )}
      >
        {current === "warmup" ? "W" : current === "failure" ? "F" : setNumber}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-8 z-20 flex gap-1 rounded border border-neutral-200 bg-white p-1 shadow-md">
            {TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => { onChange(t.key); setOpen(false) }}
                className={cn("h-7 w-7 rounded text-xs font-bold", t.cls)}
              >{t.label}</button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: SetRow (각 세트 행, 인라인 입력)**

```typescript
"use client"
import { useState, useTransition } from "react"
import { updateSet, deleteSet } from "@/lib/actions/workout-sets"
import { SetTypePicker } from "./SetTypePicker"
import type { SetType } from "@/lib/validators/workout"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export type SetRowData = {
  id: string
  set_number: number
  set_type: SetType
  weight_kg: number | null
  reps: number | null
  completed: boolean
}

export function SetRow({
  set,
  prev,
  sessionId,
}: {
  set: SetRowData
  prev: { weight_kg: number | null; reps: number | null } | null
  sessionId: string
}) {
  const [weight, setWeight] = useState(set.weight_kg?.toString() ?? "")
  const [reps, setReps] = useState(set.reps?.toString() ?? "")
  const [completed, setCompleted] = useState(set.completed)
  const [type, setType] = useState<SetType>(set.set_type)
  const [pending, start] = useTransition()

  const persist = (patch: { weight_kg?: number | null; reps?: number | null; completed?: boolean; set_type?: SetType }) =>
    start(async () => {
      const r = await updateSet(set.id, sessionId, patch)
      if (!r.ok) toast.error(r.error)
    })

  const onTypeChange = (next: SetType) => {
    setType(next)
    persist({ set_type: next })
  }

  const onCommitWeight = () => {
    const v = weight.trim() === "" ? null : Number(weight)
    if (v != null && Number.isNaN(v)) { toast.error("숫자만"); setWeight(set.weight_kg?.toString() ?? ""); return }
    persist({ weight_kg: v })
  }
  const onCommitReps = () => {
    const v = reps.trim() === "" ? null : Number(reps)
    if (v != null && (Number.isNaN(v) || v < 0)) { toast.error("0 이상 숫자"); setReps(set.reps?.toString() ?? ""); return }
    persist({ reps: v })
  }
  const onToggleCompleted = () => {
    const next = !completed
    setCompleted(next)
    persist({ completed: next })
  }

  const onDelete = () =>
    start(async () => {
      const r = await deleteSet(set.id, sessionId)
      if (!r.ok) toast.error(r.error)
    })

  const prevText = prev
    ? prev.weight_kg != null && prev.reps != null
      ? `${prev.weight_kg}×${prev.reps}`
      : prev.reps != null
        ? `${prev.reps}렙`
        : prev.weight_kg != null
          ? `${prev.weight_kg}kg`
          : "-"
    : "-"

  return (
    <div className={cn(
      "grid grid-cols-[40px_60px_1fr_1fr_40px_24px] items-center gap-1 text-sm",
      completed && "bg-green-50",
    )}>
      <SetTypePicker current={type} setNumber={set.set_number} onChange={onTypeChange} />
      <div className="text-xs text-neutral-400">{prevText}</div>
      <input
        type="number"
        inputMode="decimal"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        onBlur={onCommitWeight}
        placeholder="kg"
        className="w-full rounded border border-neutral-200 px-2 py-1 text-center"
      />
      <input
        type="number"
        inputMode="numeric"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        onBlur={onCommitReps}
        placeholder="렙"
        className="w-full rounded border border-neutral-200 px-2 py-1 text-center"
      />
      <button
        onClick={onToggleCompleted}
        className={cn(
          "h-7 w-9 rounded text-xs font-bold",
          completed ? "bg-green-600 text-white" : "border border-neutral-300 text-neutral-400"
        )}
      >✓</button>
      <button onClick={onDelete} disabled={pending} className="text-xs text-neutral-300 hover:text-red-600">×</button>
    </div>
  )
}
```

- [ ] **Step 3: ExerciseBlock (운동 1개 + 세트 표)**

```typescript
"use server"
import { createClient } from "@/lib/supabase/server"
import { addSet } from "@/lib/actions/workout-sets"
import { findPreviousSet } from "@/lib/actions/workout-sets"
import { removeExerciseFromSession } from "@/lib/actions/workout-sessions"
import { SetRow, type SetRowData } from "./SetRow"
import type { SetType } from "@/lib/validators/workout"

async function AddSetForm({ sessionExerciseId, sessionId }: { sessionExerciseId: string; sessionId: string }) {
  return (
    <form
      action={async () => {
        "use server"
        await addSet(sessionExerciseId, sessionId)
      }}
    >
      <button className="w-full rounded border border-dashed border-neutral-300 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50">
        + 세트 추가
      </button>
    </form>
  )
}

async function RemoveExerciseForm({ sessionExerciseId, sessionId }: { sessionExerciseId: string; sessionId: string }) {
  return (
    <form
      action={async () => {
        "use server"
        await removeExerciseFromSession(sessionExerciseId, sessionId)
      }}
    >
      <button className="text-xs text-red-600 hover:underline">운동 삭제</button>
    </form>
  )
}

export async function ExerciseBlock({
  sessionExercise,
  sets,
  sessionId,
}: {
  sessionExercise: { id: string; exercise_name: string; body_part: string }
  sets: SetRowData[]
  sessionId: string
}) {
  // 각 세트의 직전 기록 fetch
  const prevs = await Promise.all(
    sets.map((s) =>
      findPreviousSet(sessionExercise.exercise_name, s.set_number, sessionId)
    )
  )

  return (
    <section className="space-y-1.5 rounded border border-neutral-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{sessionExercise.exercise_name}</h3>
        <RemoveExerciseForm sessionExerciseId={sessionExercise.id} sessionId={sessionId} />
      </div>
      <div className="grid grid-cols-[40px_60px_1fr_1fr_40px_24px] items-center gap-1 px-1 text-[10px] uppercase text-neutral-400">
        <div>세트</div><div>이전</div><div className="text-center">kg</div><div className="text-center">렙</div><div></div><div></div>
      </div>
      <div className="space-y-1">
        {sets.map((s, i) => (
          <SetRow key={s.id} set={s as SetRowData} prev={prevs[i]} sessionId={sessionId} />
        ))}
      </div>
      <AddSetForm sessionExerciseId={sessionExercise.id} sessionId={sessionId} />
    </section>
  )
}
```

> ※ `ExerciseBlock`은 server component인데 안에서 `SetRow`(client) 호출. server component 내 server action form은 가계부 패턴 동일.

- [ ] **Step 4: 타입체크 + 커밋**

```bash
pnpm exec tsc --noEmit
git add app/workout/session/ components/workout/session/
git commit -m "feat(workout): /workout/session/[id] — 세션 화면 (운동/세트/타입/완료)"
```

---

## Task 13: /workout/session/[id]/complete — 완료 화면

**Files:**
- Create: `app/workout/session/[id]/complete/page.tsx`
- Create: `components/workout/complete/CompleteScreen.tsx`

- [ ] **Step 1: CompleteScreen**

```typescript
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { formatDuration, formatWeight } from "@/lib/utils/workout-format"

type BestSet = { exercise_name: string; weight_kg: number | null; reps: number | null; set_count: number }

export function CompleteScreen({
  workoutNumber,
  routineName,
  date,
  durationMinutes,
  totalWeightKg,
  prCount,
  bestSets,
}: {
  workoutNumber: number
  routineName: string
  date: string
  durationMinutes: number | null
  totalWeightKg: number
  prCount: number
  bestSets: BestSet[]
}) {
  return (
    <div className="mx-auto max-w-md space-y-6 p-4 text-center md:p-6">
      <div className="text-3xl">⭐⭐⭐</div>
      <h1 className="text-xl font-bold">잘 하셨습니다!</h1>
      <p className="text-sm text-neutral-600">이것은 회원님의 <strong>{workoutNumber}번째</strong> 워크아웃입니다!</p>

      <div className="rounded-lg border border-neutral-200 bg-white p-4 text-left">
        <h2 className="text-base font-semibold">{routineName}</h2>
        <p className="mt-1 text-xs text-neutral-500">{date}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[10px] text-neutral-400">⏱ 시간</div>
            <div className="text-sm font-semibold">{formatDuration(durationMinutes)}</div>
          </div>
          <div>
            <div className="text-[10px] text-neutral-400">🏋️ 총 무게</div>
            <div className="text-sm font-semibold">{formatWeight(totalWeightKg)}</div>
          </div>
          <div>
            <div className="text-[10px] text-neutral-400">🏆 PR</div>
            <div className="text-sm font-semibold">{prCount}</div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4 text-left">
        <h3 className="mb-2 text-xs font-semibold uppercase text-neutral-500">운동 · 최고 세트</h3>
        <ul className="space-y-1.5 text-sm">
          {bestSets.map((b, i) => (
            <li key={i} className="flex justify-between">
              <span>{b.set_count} × {b.exercise_name}</span>
              <span className="text-neutral-600">
                {b.weight_kg != null && b.reps != null
                  ? `${b.weight_kg}kg × ${b.reps}`
                  : b.reps != null
                    ? `${b.reps}렙`
                    : "-"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <Link href="/workout/start">
        <Button className="w-full">처음으로</Button>
      </Link>
    </div>
  )
}
```

- [ ] **Step 2: complete page (server)**

```typescript
import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { CompleteScreen } from "@/components/workout/complete/CompleteScreen"
import { estimated1RM } from "@/lib/utils/workout-1rm"

export default async function CompletePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: session } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (!session) notFound()

  // 총 워크아웃 번호 = ended_at 있는 세션 카운트
  const { count } = await supabase
    .from("workout_sessions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .not("ended_at", "is", null)
  const workoutNumber = count ?? 1

  // 운동별 최고 세트
  const { data: sessionExs } = await supabase
    .from("workout_session_exercises")
    .select("id, exercise_name")
    .eq("session_id", id)
    .order("sort_order", { ascending: true })

  const { data: sets } = await supabase
    .from("workout_sets")
    .select("session_exercise_id, weight_kg, reps, set_type, completed")
    .in("session_exercise_id", (sessionExs ?? []).map((s) => s.id))

  const bestSets = (sessionExs ?? []).map((se) => {
    const exSets = (sets ?? []).filter((s) => s.session_exercise_id === se.id && s.completed && s.set_type === "working")
    let best: { weight_kg: number | null; reps: number | null } | null = null
    let bestScore = -1
    for (const s of exSets) {
      const score = estimated1RM(s.weight_kg, s.reps) ?? s.reps ?? 0
      if (score > bestScore) {
        bestScore = score
        best = { weight_kg: s.weight_kg, reps: s.reps }
      }
    }
    return {
      exercise_name: se.exercise_name,
      set_count: exSets.length,
      weight_kg: best?.weight_kg ?? null,
      reps: best?.reps ?? null,
    }
  })

  return (
    <CompleteScreen
      workoutNumber={workoutNumber}
      routineName={session.routine_name ?? "빈 워크아웃"}
      date={session.date}
      durationMinutes={session.duration_minutes}
      totalWeightKg={Number(session.total_weight_kg)}
      prCount={session.pr_count}
      bestSets={bestSets}
    />
  )
}
```

- [ ] **Step 3: 타입체크 + 커밋**

```bash
pnpm exec tsc --noEmit
git add app/workout/session/ components/workout/complete/
git commit -m "feat(workout): /workout/session/[id]/complete — 완료 화면"
```

---

## Task 14: 사이드바 (운동 종목/템플릿 링크 + 날짜 트리 RPC)

**Files:**
- Modify: `components/workout/sidebar/WorkoutSidebar.tsx`
- Create: `components/workout/sidebar/WorkoutSidebarTree.tsx`

- [ ] **Step 1: Server component WorkoutSidebar**

```typescript
// components/workout/sidebar/WorkoutSidebar.tsx
import { createClient } from "@/lib/supabase/server"
import { WorkoutSidebarTree, type YearGroup } from "./WorkoutSidebarTree"

type WorkoutDateRow = { date: string; label: string }

export async function WorkoutSidebar() {
  const supabase = await createClient()
  const { data: rows, error } = await supabase.rpc("get_user_workout_dates")
  if (error) {
    return (
      <aside className="fixed left-0 top-0 z-50 h-screen w-56 border-r border-neutral-200 bg-white p-4 md:sticky">
        <p className="text-sm text-red-600">사이드바 로드 실패: {error.message}</p>
      </aside>
    )
  }

  // year > month > [{date, label}] 그룹화 (오름차순)
  const yearMap = new Map<number, Map<number, WorkoutDateRow[]>>()
  for (const r of (rows ?? []) as WorkoutDateRow[]) {
    const d = new Date(`${r.date}T00:00:00Z`)
    const y = d.getUTCFullYear()
    const m = d.getUTCMonth() + 1
    if (!yearMap.has(y)) yearMap.set(y, new Map())
    const mm = yearMap.get(y)!
    if (!mm.has(m)) mm.set(m, [])
    mm.get(m)!.push(r)
  }
  const yearGroups: YearGroup[] = Array.from(yearMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, monthsMap]) => ({
      year,
      months: Array.from(monthsMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([month, dates]) => ({ month, dates: dates.sort((a, b) => a.date.localeCompare(b.date)) })),
    }))

  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth() + 1

  return (
    <WorkoutSidebarTree
      yearGroups={yearGroups}
      currentYear={currentYear}
      currentMonth={currentMonth}
    />
  )
}
```

- [ ] **Step 2: Client component WorkoutSidebarTree**

```typescript
"use client"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export type DateRow = { date: string; label: string }
export type MonthGroup = { month: number; dates: DateRow[] }
export type YearGroup = { year: number; months: MonthGroup[] }

const TOP_LINKS = [
  { href: "/workout/start", label: "🏠 시작" },
  { href: "/workout/exercises", label: "🏋️ 운동 종목" },
  { href: "/workout/templates", label: "📋 템플릿" },
] as const

export function WorkoutSidebarTree({
  yearGroups,
  currentYear,
  currentMonth,
}: {
  yearGroups: YearGroup[]
  currentYear: number
  currentMonth: number
}) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>(() => ({ [currentYear]: true }))
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>(() => ({ [`${currentYear}-${currentMonth}`]: true }))

  const toggleYear = (y: number) => setExpandedYears((p) => ({ ...p, [y]: !p[y] }))
  const toggleMonth = (y: number, m: number) => setExpandedMonths((p) => {
    const k = `${y}-${m}`
    return { ...p, [k]: !p[k] }
  })

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-3 z-40 md:hidden"
        aria-label="사이드바 열기"
      >☰</button>
      {mobileOpen ? (
        <div onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-black/40 md:hidden" />
      ) : null}
      <aside className={cn(
        "fixed left-0 top-0 z-50 h-screen w-56 border-r border-neutral-200 bg-white px-3 py-4 transition-transform md:sticky md:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="flex h-full flex-col overflow-y-auto">
          <ul className="mb-4 space-y-0.5">
            {TOP_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "block rounded px-2 py-1 text-sm",
                    pathname === l.href ? "bg-neutral-100 font-semibold" : "text-neutral-600 hover:bg-neutral-50"
                  )}
                >{l.label}</Link>
              </li>
            ))}
          </ul>
          <h2 className="mb-2 px-2 text-xs font-semibold text-neutral-500">📔 워크아웃 이력</h2>
          {yearGroups.length === 0 ? (
            <p className="px-2 text-xs text-neutral-400">아직 운동 기록 없음</p>
          ) : (
            <ul className="space-y-1">
              {yearGroups.map((yg) => (
                <li key={yg.year}>
                  <button
                    onClick={() => toggleYear(yg.year)}
                    className="flex w-full items-center gap-1 rounded px-2 py-1 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    <span className="text-neutral-400">{expandedYears[yg.year] ? "▼" : "▶"}</span>
                    {yg.year}년
                  </button>
                  {expandedYears[yg.year] && (
                    <ul className="ml-3 mt-1 space-y-0.5">
                      {yg.months.map((mg) => {
                        const mKey = `${yg.year}-${mg.month}`
                        return (
                          <li key={mKey}>
                            <button
                              onClick={() => toggleMonth(yg.year, mg.month)}
                              className="flex w-full items-center gap-1 rounded px-2 py-0.5 text-xs text-neutral-600 hover:bg-neutral-50"
                            >
                              <span className="text-neutral-400">{expandedMonths[mKey] ? "▼" : "▶"}</span>
                              {mg.month}월
                            </button>
                            {expandedMonths[mKey] && (
                              <ul className="ml-3 space-y-0">
                                {mg.dates.map((d) => (
                                  <li key={d.date}>
                                    <Link
                                      href={`/workout/history/${d.date}/`}
                                      onClick={() => setMobileOpen(false)}
                                      className="block rounded px-2 py-0.5 text-[11px] text-neutral-600 hover:bg-neutral-50"
                                    >
                                      {d.date.slice(5)} — {d.label}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  )
}
```

> ※ 사이드바의 history 링크 (`/workout/history/...`)는 Phase 2 라우트라 MVP에서는 404 됨. 의도적임 (이력 트리에 클릭 가능하게 보이게 하되, 활성 페이지는 Phase 2). Phase 2에서 history 라우트 추가하면 자동 동작.

- [ ] **Step 3: 타입체크 + 커밋**

```bash
pnpm exec tsc --noEmit
git add components/workout/sidebar/
git commit -m "feat(workout): 사이드바 — 상단 링크 + 워크아웃 이력 트리 (RPC)"
```

---

## Task 15: 빌드 + 배포 + 헤더에 운동기록 메뉴 추가

**Files:**
- Modify: `components/common/GlobalHeader.tsx` (이미 운동기록 링크 있을 가능성 — 점검)

- [ ] **Step 1: GlobalHeader 점검**

```bash
grep -n "workout" components/common/GlobalHeader.tsx
```

운동기록 링크가 없다면 가계부·일기장 옆에 `/workout` 추가:

```typescript
// 가계부 / 일기장 옆 운동기록 링크 추가 (이미 있으면 스킵)
```

- [ ] **Step 2: 로컬 빌드**

```bash
pnpm exec next build
```
Expected: 빌드 통과. 새 라우트 모두 인식됨.

- [ ] **Step 3: 커밋 + 푸시**

```bash
git add -A
git commit -m "feat(workout): Phase 1 MVP — 헤더 운동기록 활성화 + 빌드 검증"
git push origin main
```

- [ ] **Step 4: Vercel 배포 대기**

```
mcp__claude_ai_Vercel__list_deployments → 최신 deploy state = READY 까지.
```

---

## Manual Test Gates

배포 끝나면 실제 운동기록 1회 진행하면서 다음 점검:

### Gate A: 기본 흐름 — 빈 워크아웃 (가장 중요)
- [ ] `/workout` 접속 시 `/workout/start`로 redirect
- [ ] [+ 빈 워크아웃 시작] 클릭 → `/workout/session/[id]`로 이동, 세션 생성됨
- [ ] [+ 운동 추가] 클릭 → vaul 시트 열림, 운동 검색 가능
- [ ] 시트에서 [+ 새 운동 만들기] 클릭 → 다이얼로그 → 저장 후 자동으로 세션에 추가
- [ ] 운동 카드에 빈 working 세트 1개 생성됨
- [ ] kg/렙 입력 후 blur → 저장됨 (새로고침 후 유지)
- [ ] ✓ 클릭 → 행 초록 배경, completed=true 저장
- [ ] [+ 세트 추가] → 새 세트 행 1개 추가
- [ ] 좌측 세트 번호 탭 → W/본/F 팔레트 → 변경 즉시 저장

### Gate B: 템플릿 흐름
- [ ] `/workout/templates`에서 폴더 만들고, 루틴 만들고, 운동 추가
- [ ] `/workout/start`에서 만든 폴더·루틴 보임
- [ ] 루틴 카드 클릭 → 세션 시작 → 루틴 운동들 자동으로 들어가 있고 각각 default_sets개 세트 생성됨

### Gate C: 트리거 (DB)
- [ ] 세트 ✓ 토글 → `workout_sessions.total_weight_kg`이 즉시 갱신 (SQL: `SELECT total_weight_kg FROM workout_sessions WHERE id=...`)
- [ ] working 세트에 weight/reps 채우고 ✓ → 같은 운동 신기록이면 `workout_personal_records`에 INSERT, `pr_count` 증가
- [ ] [완료] 버튼 → `ended_at` 설정, `duration_minutes` 자동 계산

### Gate D: 완료 화면
- [ ] `/workout/session/[id]/complete` 자동 이동
- [ ] N번째 워크아웃 표시 (ended_at != null인 세션 카운트)
- [ ] 시간/총 무게/PR 개수 정확
- [ ] 운동별 최고 세트 (working 중 estimated_1rm 최고)

### Gate E: 사이드바
- [ ] 좌측 상단에 시작/운동 종목/템플릿 링크
- [ ] 워크아웃 이력 트리에 오늘 날짜 + 루틴명/`워크아웃` 라벨 보임
- [ ] 년/월 collapse 토글
- [ ] (history 라우트는 Phase 2라 404 — 의도적)

### Gate F: RLS
- [ ] 로그아웃 후 `/workout/start` 접근 — 빈 페이지 (다른 사용자 데이터 안 보임)
- [ ] (시간 되면) 다른 계정 로그인 후 본인 데이터만 보임

### Gate G: 모바일
- [ ] 모바일 뷰포트에서 ☰ 사이드바 토글 작동
- [ ] 세션 화면에서 세트 입력 표가 화면에 맞게 표시 (5컬럼 그리드)
- [ ] AddExerciseSheet (vaul Drawer)가 모바일에서 잘 열림

### Gate H: 직전 기록 (이전 컬럼)
- [ ] 첫 세션에서는 "이전" = `-`
- [ ] 같은 운동 두 번째 세션 시작 → 첫 세션 같은 세트번호의 weight×reps가 회색으로 보임

---

## 알려진 제약 (Phase 2로)

- `/workout/history/[date]/[id]` — 사이드바 링크는 보이지만 라우트 미구현 (404). MVP에 없음.
- `/workout/calendar` — 사이드바에 링크 없음. MVP에 없음.
- 세션 편집 — 이미 완료한 세션 수정 미구현.
- 빈 워크아웃 → 템플릿 저장 — 완료 후 "템플릿으로 저장" 옵션 미구현.
- PR 페이지 — 운동별 1RM 진행 그래프 미구현.

## 알려진 제약 (v2)

- 휴식 타이머 없음 (Q1 결정)
- 드롭세트 없음 (Q4 결정)
- 신기록 시각 효과 (축포 등) 없음
- Strong CSV import 안 함 (Q7 결정)
- Apple Watch 연동 안 함
- 일기장 Daily Quest "헬스" 자동 연동 안 함

---

## Time Budget (목표)

| Task | 예상 시간 |
|---|---|
| 1: 마이그레이션 | 30분 |
| 2: validators + utils | 20분 |
| 3-6: 4 server actions | 90분 |
| 7: 라우트 골격 | 15분 |
| 8: /start | 45분 |
| 9: /exercises | 60분 |
| 10: /templates | 90분 |
| 11: /session 골격 + AddExerciseSheet | 90분 |
| 12: SetRow + SetTypePicker + ExerciseBlock | 120분 |
| 13: /complete | 45분 |
| 14: 사이드바 | 60분 |
| 15: 빌드 + 배포 | 30분 |
| Manual gates | 60분 |
| **합계** | **약 13시간** |

여유 시간 11시간으로 디버깅·UX 보정.
