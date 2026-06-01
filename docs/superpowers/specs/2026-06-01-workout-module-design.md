# 운동기록 모듈 (Workout) Design Spec

> 작성일: 2026-06-01
> 모듈: 3순위 (가계부 → 일기장 → 운동기록)
> 소스 PRD: https://www.notion.so/372cf37612468133a843fae0b26f8d72
> 시간 제약: 2026-06-02 Claude Max 만료. Phase 1 MVP 24시간 안에.

---

## 1. 목표

Strong앱(5년·828 워크아웃) 핵심 흐름 — 템플릿 → 루틴 → 세트 기록 → 완료 — 을 통합 PWA `seungsoo-life`의 `/workout` 라우트에 재현. 가계부·일기장 패턴(스냅샷, RLS, Server Actions, 사이드바 layout) 답습.

## 2. 핵심 결정사항 (PRD 8개 + brainstorming 2개)

PRD 확정 (그대로):
1. 휴식 타이머 **제외**
2. PR 자동 추적 **포함** (별 효과는 v2)
3. 템플릿 구조: **폴더 + 루틴 2계층**
4. 세트 타입: **워밍업(W) / 본세트(숫자) / 실패(F)** 3종만
5. 빈 워크아웃 **포함**
6. 대시보드는 **캘린더만** (막대그래프 X) — Phase 2
7. 5년 Strong 데이터 **가져오기 안 함**
8. 가계부/일기장 패턴 **답습**

Brainstorming 확정:
9. **PR 자동 처리 = DB 트리거** (다른 모듈과 일관, 클라이언트 변경에도 안전)
10. **빈 워크아웃 운동 추가 UX** = 세션 안에서 종목 검색 → 선택 → 즉시 세트 입력. 종목 없으면 그 자리에서 새 종목 다이얼로그 (이름+부위+카테고리 저장).

## 3. 사이트 구조

### 3.1 라우트
```
/workout                      → /workout/start 리다이렉트
/workout/start                메인 진입점 (빈 워크아웃 + 템플릿 폴더 트리)
/workout/session/[id]         활성 세션 (운동 기록 중)
/workout/exercises            운동 종목 마스터 (CRUD)
/workout/templates            템플릿/루틴 관리 (Phase 2 분리 가능)

# Phase 2:
/workout/history/[date]/[id]  과거 세션 보기
/workout/calendar             월간 캘린더
```

### 3.2 사이드바
```
⚙️ 설정
  · 매주 시작일 (월요일 고정, 일기장과 통일)
  · 무게 단위 (kg 고정)

🏋️ 운동 종목 관리         ← /workout/exercises
📋 템플릿                  ← /workout/templates
📅 캘린더 (Phase 2)        ← /workout/calendar (MVP에서는 placeholder)

📔 워크아웃 이력 (날짜 트리)
  └ 2026년
    └ 6월
      └ 6/1 — Day5 무분할
      └ 6/3 — 2분할 가슴
```

이력 트리: 운동한 날짜만 표시 (pre-create 안 함, 일기장과 다름).
정렬: 일기장 답습 — year asc → month asc → day asc.

### 3.3 메인 자동 이동
`/workout` 접속 → `/workout/start`로 redirect (가계부 `/budget` → 현재월 패턴 답습).

## 4. DB 스키마 (마이그레이션 0011)

### 4.1 테이블

```sql
-- 운동 종목 마스터
workout_exercises
  id           uuid PK default gen_random_uuid()
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
  name         text NOT NULL                  -- "Bench Press (Barbell)"
  body_part    text NOT NULL CHECK (body_part IN (...))
  category     text NOT NULL CHECK (category IN (...))
  sort_order   int DEFAULT 0
  created_at   timestamptz DEFAULT now()

-- 템플릿 폴더
workout_template_folders
  id           uuid PK
  user_id      uuid NOT NULL
  name         text NOT NULL                  -- "승수 4분할 템플릿"
  sort_order   int DEFAULT 0
  created_at   timestamptz DEFAULT now()

-- 루틴 (폴더 안에)
workout_routines
  id           uuid PK
  user_id      uuid NOT NULL
  folder_id    uuid NULL REFERENCES workout_template_folders(id) ON DELETE SET NULL
  name         text NOT NULL                  -- "Day5 무분할"
  sort_order   int DEFAULT 0
  created_at   timestamptz DEFAULT now()
  updated_at   timestamptz DEFAULT now()

-- 루틴 내 운동 (기본 세트 수)
workout_routine_exercises
  id           uuid PK
  routine_id   uuid NOT NULL REFERENCES workout_routines(id) ON DELETE CASCADE
  exercise_id  uuid NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE
  default_sets int DEFAULT 3
  sort_order   int DEFAULT 0

-- 워크아웃 세션
workout_sessions
  id              uuid PK
  user_id         uuid NOT NULL
  date            date NOT NULL DEFAULT current_date  -- INDEX
  started_at      timestamptz DEFAULT now()
  ended_at        timestamptz NULL                    -- 진행 중이면 null
  duration_minutes int NULL                            -- 트리거 계산
  -- 루틴 스냅샷 (스냅샷 패턴)
  routine_id      uuid NULL                            -- 원본 참조용 (편집 가능)
  routine_name    text NULL                            -- 스냅샷
  folder_name     text NULL                            -- 스냅샷
  -- 자동 계산 (트리거)
  total_weight_kg numeric(10,2) DEFAULT 0
  pr_count        int DEFAULT 0
  created_at      timestamptz DEFAULT now()
  updated_at      timestamptz DEFAULT now()

-- 세션 내 운동 (스냅샷)
workout_session_exercises
  id              uuid PK
  session_id      uuid NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE
  exercise_id     uuid NULL                  -- 원본 참조
  exercise_name   text NOT NULL              -- 스냅샷
  body_part       text NOT NULL              -- 스냅샷
  category        text NOT NULL              -- 스냅샷
  sort_order      int DEFAULT 0

-- 각 세트
workout_sets
  id                  uuid PK
  session_exercise_id uuid NOT NULL REFERENCES workout_session_exercises(id) ON DELETE CASCADE
  set_number          int NOT NULL                       -- 1, 2, 3...
  set_type            text NOT NULL CHECK (set_type IN ('warmup', 'working', 'failure'))
  weight_kg           numeric(7,2) NULL                  -- 맨몸은 null
  reps                int NULL                            -- Duration은 null (옵션)
  duration_seconds    int NULL                            -- Cardio용 (옵션, v2)
  completed           bool DEFAULT false
  sort_order          int DEFAULT 0
  created_at          timestamptz DEFAULT now()

-- PR 자동 추적
workout_personal_records
  id              uuid PK
  user_id         uuid NOT NULL
  exercise_name   text NOT NULL              -- 스냅샷 (운동 이름 바꿔도 PR 보존)
  weight_kg       numeric(7,2) NOT NULL
  reps            int NOT NULL
  estimated_1rm   numeric(10,2) NOT NULL     -- weight × (1 + reps/30) Epley
  achieved_at     timestamptz NOT NULL DEFAULT now()
  session_id      uuid REFERENCES workout_sessions(id) ON DELETE SET NULL
  set_id          uuid REFERENCES workout_sets(id) ON DELETE SET NULL
```

### 4.2 CHECK 제약

`body_part`: `Arms | Back | Cardio | Chest | Core | Full Body | Legs | Olympic | Other | Shoulders`
`category`: `Barbell | Dumbbell | Machine | Cable | Bodyweight | Assisted Bodyweight | Reps Only | Cardio | Duration | Other`
`set_type`: `warmup | working | failure`

### 4.3 트리거

**trg_workout_sets_recalc** — `workout_sets` INSERT/UPDATE/DELETE 시:
1. 해당 세션의 `total_weight_kg = SUM(coalesce(weight_kg, 0) × coalesce(reps, 0) WHERE completed=true)` 재계산.
2. PR 체크: 영향받은 `session_exercise.exercise_name`에 대해 `set_type='working' AND completed=true AND weight_kg IS NOT NULL AND reps IS NOT NULL`인 세트 중 estimated_1rm 최고치 산출. 기존 `workout_personal_records.estimated_1rm`보다 높으면 INSERT 후 세션의 `pr_count` 증가.

   **맨몸 운동(weight_kg=null) PR 미적용**: MVP는 무게 PR만. reps PR은 v2. (Pull Up 같은 운동은 완료 화면에 "최고 세트 = 10렙"으로 표시만 하고 PR 트래킹 없음.)

**trg_workout_sessions_duration** — `workout_sessions.ended_at` UPDATE 시 `duration_minutes = (ended_at - started_at) / 60` 자동.

### 4.4 RLS

모든 테이블 `user_id = auth.uid()` (가계부·일기장 동일).

routine_exercises, session_exercises, sets는 user_id 컬럼 없음 → 부모 통한 RLS:
- `routine_exercises`: `EXISTS (SELECT 1 FROM workout_routines WHERE id=routine_id AND user_id=auth.uid())`
- 같은 패턴으로 session_exercises, sets

### 4.5 스냅샷 정책

- **session 관련**: 스냅샷 (`routine_name`, `folder_name`, `exercise_name`, `body_part`, `category`)
- **template/routine 관련**: FK 유지 (편집 위해)
- **PR**: `exercise_name` 스냅샷 (운동 이름 바꿔도 PR 기록 보존)

## 5. UX 디테일

### 5.1 세트 타입 (3종)

| 타입 | 표시 | 의미 |
|---|---|---|
| 워밍업 | `W` 주황 배지 | 가벼운 무게 |
| 본세트 | `1`, `2`, `3`... | 디폴트 |
| 실패 | `F` 빨강 배지 | 무게 못 든 세트 |

- 세트 추가 시 디폴트 = 본세트
- 좌측 번호 영역 탭 → 타입 변경 팔레트
- **PR 계산은 working 세트만** 포함

### 5.2 직전 기록 표시

각 세트 행 "이전" 컬럼:
- 같은 운동 + 같은 set_number의 가장 최근 완료 세트 (회색)
- 같은 운동 첫 사용이면 빈칸

### 5.3 빈 워크아웃 흐름 (brainstorming 확정)

```
[빈 워크아웃 시작] 클릭
  → 빈 세션 생성 (routine_id=null, routine_name=null)
  → /workout/session/[id]로 이동
  → "[+ 운동 추가]" 버튼 클릭 시:
      → 종목 검색 시트 (vaul Drawer)
        - 기존 종목 리스트 + 검색
        - 하단 [+ 새 종목 만들기] 링크
          → 다이얼로그 (name + body_part + category) → 저장 후 시트로 복귀
        - 종목 탭 → 즉시 세션에 추가 + 시트 닫힘
```

### 5.4 운동 종목 추가 다이얼로그
```
새 운동 생성
Name: [_______________]
Body Part: [10개 칩 중 1개 선택]
Category: [10개 셀렉트]
[저장]
```

### 5.5 PR 계산 (Epley)
- 매 세트 `completed=true` 토글 시 트리거 실행
- 같은 user_id + exercise_name 기존 PR 1RM과 비교
- 신기록 시 `workout_personal_records` INSERT + 세션 `pr_count` 증가

### 5.6 완료 화면

```
⭐⭐⭐ 잘 하셨습니다!
이것은 회원님의 N번째 워크아웃입니다!

[routine_name]
[요일], [월 day]
⏱ N분  🏋️ N kg  🏆 N PR

운동           최고 세트
3 × Pull Up    10 렙
4 × Squat      140 kg × 5
...
```

운동별 최고 세트 = working 세트 중 estimated_1rm 최대값. Pull Up처럼 weight=null이면 reps 최대값.

### 5.7 모바일

- 세션 화면: 운동 1개당 카드 1개 (세로 스택)
- 세트 입력 표는 카드 안에 그대로 (5컬럼: 세트/이전/kg/렙/✓ — 모바일 화면에 충분)
- 카드 수정·삭제는 vaul Drawer로 (가계부 모바일 패턴 답습)
- 좌측 세트 타입 칩 탭 → 작은 popover (W/숫자/F)

## 6. 컴포넌트 (`components/workout/`)

```
sidebar/
  WorkoutSidebar.tsx           Server: dates RPC fetch + 그룹화
  WorkoutSidebarTree.tsx       Client: 트리 collapse 상태
  DateLink.tsx                  날짜 → session 링크

start/
  StartPage.tsx                 /workout/start 본문
  EmptyWorkoutButton.tsx
  TemplateFolderList.tsx
  RoutineCard.tsx

session/
  SessionHeader.tsx             제목 + 날짜 + 경과시간 (클라이언트 카운트)
  ExerciseBlock.tsx             운동 1개 + 세트 표
  SetRow.tsx                    세트 1줄
  SetTypePicker.tsx             W/숫자/F popover
  AddExerciseSheet.tsx          vaul Drawer (종목 검색)
  NewExerciseDialog.tsx         새 종목 생성
  FinishButton.tsx              [완료] → /workout/session/[id]/complete

complete/
  CompleteScreen.tsx            완료 화면 (스타+요약+운동별 최고)

exercises/
  ExerciseList.tsx              CRUD 페이지
  ExerciseRow.tsx
  NewExerciseDialog.tsx        (재사용)

templates/
  TemplateFolderEditor.tsx      Phase 2 분리 가능
  RoutineEditor.tsx
```

## 7. Server Actions (`lib/actions/`)

```
workout-exercises.ts
  - createExercise({name, body_part, category})
  - updateExercise(id, patch)
  - deleteExercise(id)
  - listExercises() — 검색용

workout-templates.ts
  - createFolder({name})
  - createRoutine({folder_id, name})
  - addRoutineExercise({routine_id, exercise_id, default_sets})
  - updateRoutineExercise(id, patch)
  - removeRoutineExercise(id)
  - deleteRoutine(id), deleteFolder(id)

workout-sessions.ts
  - startEmptySession() → returns session id
  - startSessionFromRoutine(routine_id) → 스냅샷 채워 INSERT + routine_exercises 복사
  - addExerciseToSession({session_id, exercise_id})
  - removeExerciseFromSession(session_exercise_id)
  - finishSession(session_id) → ended_at 채움 (트리거가 duration 계산)
  - deleteSession(session_id)

workout-sets.ts
  - addSet({session_exercise_id, set_type='working'})
  - updateSet(id, {weight_kg, reps, set_type, completed})
  - deleteSet(id)
```

## 8. RPC 함수

**`get_user_workout_dates()`** — 사이드바용 (일기장 `get_user_diary_mondays` 패턴 답습):
```sql
SELECT DISTINCT date, MIN(routine_name) AS label  -- 그날 첫 세션 루틴명
FROM workout_sessions
WHERE user_id = auth.uid()
GROUP BY date
ORDER BY date DESC
```
PostgREST 1000 row 캡 우회 + 라벨까지 한 번에.

## 9. Phase 분할

### Phase 1 MVP (24시간 안)

1. 마이그레이션 0011: 7테이블 + RLS + 트리거 3개 + RPC + seed (body_part/category 옵션 외엔 seed 없음)
2. `lib/actions/workout-{exercises,templates,sessions,sets}.ts`
3. `/workout` → `/workout/start` redirect
4. `/workout/start` — 빈 워크아웃 + 템플릿 폴더 트리
5. `/workout/exercises` — 종목 CRUD
6. `/workout/templates` — 폴더+루틴 관리 (간단한 인라인 편집)
7. `/workout/session/[id]` — 세션 화면 (운동 추가, 세트 입력, 타입 변경, 완료)
8. `/workout/session/[id]/complete` — 완료 화면
9. 사이드바 (운동 종목, 템플릿, 날짜 트리)

### Phase 2 (만료 후, Pro로)

- `/workout/calendar` — 월간 그리드
- `/workout/history/[date]/[id]` — 과거 세션 보기
- 세션 편집 (이미 완료된 거 수정)
- 빈 워크아웃 → 템플릿 저장
- PR 페이지 (운동별 1RM 진행)

### v2 검토

- 휴식 타이머 (1주일 사용 후 판단)
- 드롭세트
- 신기록 시각 효과
- Strong CSV import
- Apple Watch 연동
- 일기장 Daily Quest "헬스" 자동 연동

## 10. 기술 스택

기존 `seungsoo-life`에 통합:
- Next.js 14 App Router + TypeScript + Tailwind v3
- shadcn/base-ui + vaul Drawer (모바일 시트)
- Supabase Postgres + Auth + RLS + Trigger
- Server Components + Server Actions (RPC는 사이드바 dates만)
- Zod 검증

## 11. 절대 지킬 규칙

1. **세션 스냅샷**: `routine_name`, `folder_name`, `exercise_name`, `body_part`, `category` 값 자체 저장
2. **PR 스냅샷**: `exercise_name` 스냅샷
3. **템플릿·루틴 FK 유지** (편집용)
4. **세트 타입 정확히 3종**: `warmup`/`working`/`failure`
5. **PR 계산 = working 세트만**, 워밍업·실패 제외
6. **Epley 공식**: `weight × (1 + reps/30)`
7. **메인 자동 이동**: `/workout` → `/workout/start`
8. **휴식 타이머 제외** (PRD Q1)
9. **주 시작일 = 월요일** (일기장 통일, Phase 2 캘린더용)

## 12. 시간 박스 (Phase 1 MVP)

24시간 내 완료 가능한 범위:
- DB + 트리거 + RPC: 1시간
- Server Actions: 2시간
- /start + /exercises + /templates: 4시간
- /session/[id] (가장 복잡): 6시간
- /session/[id]/complete: 1시간
- 사이드바: 2시간
- 모바일 vaul 적용 + 디버깅: 4시간
- 배포 검증: 2시간
- **여유**: 2시간

Phase 2는 만료 후 Pro로 진행.
