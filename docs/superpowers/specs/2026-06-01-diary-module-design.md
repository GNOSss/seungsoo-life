# 일기장 모듈 Phase 1 MVP Design Spec

**Date:** 2026-06-01
**Status:** Approved (design Q&A completed)
**Scope:** 시간 로그(자연어 입력 → 24시간 타임라인 시각화) + Daily Quest 체크 + 활동 라이브러리(자동 학습) + 일자별 사이드바
**PRD:** https://www.notion.so/372cf37612468142b14fdcf23675c477

---

## 1. 배경 + 성공 기준

승수는 5년간 굿노트(주간 시각 일기) + 메모장(시간 로그 자연어 한 줄) 이원 시스템 운용. 통합 PWA로 옮긴다.

**성공 기준 (Phase 1 MVP 완료 시점):**
- 6월부터 매일 자연어 한 줄(`개발0018` 형식)로 시간 로그 입력 가능
- 입력 즉시 24시간 세로 타임라인이 색상 마스킹으로 그려짐
- 슬롯 클릭 → 팔레트 → 색 지정 → 활동 라이브러리에 매핑 자동 저장
- 다음 입력부터 같은 활동명은 등록된 색 자동 적용
- Daily Quest 5+α 체크박스 매일 수동 체크
- 사이드바에서 일자 트리 탐색 + 메인 자동 이동(오늘) + 일자 삭제

**Phase 2 이후 (이번 MVP에서 제외):**
- 일정/백로그/아이디어/정기일정 (4영역)
- 주간 회고 (Daily Quest 5×7 그리드)
- 월간 통계, 검색, 동의어 매핑, Quest 자동 연동

---

## 2. 절대 규칙 (PRD §11 + 가계부 패턴 답습)

1. **활동 스냅샷**: `diary_entries`에 `activity_id` FK 금지. `activity_name` + `color` 값 자체 저장. 라이브러리 색 변경해도 과거 row 불변.
2. **자연어 파싱**: 마지막 4자리 = HHMM (24시간제), 그 앞 전부 = 활동명 (공백·구두점·한자 허용).
3. **첫 항목 시작 시각**: 전날 마지막 활동의 종료 시각 + 1분 (자동 추론). 전날 데이터 없으면 미정.
4. **디폴트 색**: `#D8D8D8` 연회색 (사전 등록된 활동은 등록된 색).
5. **슬롯 클릭 자동 학습**: 타임라인 슬롯 클릭 → 팔레트 → 색 선택 → 즉시 그 활동의 라이브러리 색 UPSERT.
6. **메인 자동 이동**: `/diary` 접속 시 오늘 날짜로 redirect.
7. **RLS**: 모든 신규 테이블 `user_id = auth.uid()` (가계부와 동일).

---

## 3. 설계 결정 사항

| # | 항목 | 결정 |
|---|---|---|
| A | 타임라인 시각화 | CSS Grid 96 셀(24×4, 15분 단위), 각 셀이 `<button>` |
| B | URL 형식 | `/diary/[date]` (단일 세그먼트, `2026-06-01`) — 가계부 `/budget/[ym]` 패턴 일관 |
| C | 시드 데이터 | 0007 마이그레이션에 활동 라이브러리 6개 + Daily Quest 5개 시드 INSERT |
| D | 일별 페이지 Daily Quest UI | 그날 5+α 체크박스 가로 일렬. 주간 5×7 그리드는 Phase 3 |
| E | 시간 로그 편집 | textarea 전체 편집 → 저장 시 그 날 entries 전부 replace (delete + insert) |
| F | 슬롯 클릭 팔레트 UI | 데스크탑 = base-ui Popover, 모바일 = vaul Drawer 하단 시트 |
| G | 라이브러리 자동 학습 | 슬롯 색 지정 즉시 `diary_activities` 해당 활동 행 UPSERT (name + color) |
| H | 시간 로그 입력 단위 | textarea multiline, 한 줄 = 한 활동 |
| I | 4영역 (일정/백로그/...) | Phase 1 미포함 (Phase 2) |
| J | 자정 넘김 처리 | 자동 분할 (오늘 23:50-24:00 + 다음날 00:00-00:30 → 2 row) |
| K | 사이드바 일자 ✕ 삭제 | 일자별 ✕ 추가 (가계부 ADR-024 패턴 재사용) |

---

## 4. DB 스키마 (마이그레이션 0007)

### 4.1 `diary_activities` — 활동 라이브러리

```sql
create table public.diary_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,           -- 활동명 (예: "잠", "개발")
  color text not null,          -- hex (#F5A623 등)
  sort_order int not null default 0,
  created_at timestamptz default now(),
  unique (user_id, name)
);
```

`alias` 컬럼은 PRD v2 항목이라 MVP에서 제외.

### 4.2 `diary_quests` — Daily Quest 항목 정의

```sql
create table public.diary_quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz default now()
);
```

### 4.3 `diary_days` — 일별 페이지 메타

```sql
create table public.diary_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  raw_input text not null default '',  -- 사용자가 입력한 textarea 원본 전체 보존
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, date)
);
```

> `raw_input` 추가 이유: 파싱 실패 라인이나 사용자의 임의 메모도 보존. 재편집 시 원본 표시.

### 4.4 `diary_entries` — 시간 로그 (활동 row, 스냅샷)

```sql
create table public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  start_time time not null,        -- 00:19:00
  end_time time not null,          -- 03:00:00
  duration_minutes int not null,   -- end - start (분 단위, 트리거로 계산)
  activity_name text not null,
  color text not null default '#D8D8D8',
  raw_input text,                  -- 원본 라인 ("드라마0300"), 검색·디버깅용
  created_at timestamptz default now()
);

create index diary_entries_user_date_idx on public.diary_entries (user_id, date);
```

### 4.5 `diary_quest_checks` — Daily Quest 체크 기록

```sql
create table public.diary_quest_checks (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  quest_id uuid not null references public.diary_quests(id) on delete cascade,
  checked boolean not null default false,
  primary key (user_id, date, quest_id)
);
```

quest_id FK는 OK (스냅샷 패턴 적용 안 함 — quest 자체가 사용자 정의 항목이고 이름 변경/삭제 시 과거 체크 보존할 만큼 비즈니스 가치 없음).

### 4.6 트리거

```sql
-- duration_minutes 자동 계산
create function public.calc_diary_entry_duration() returns trigger as $$
begin
  new.duration_minutes := extract(epoch from (new.end_time - new.start_time))::int / 60;
  return new;
end;
$$ language plpgsql;

create trigger trg_diary_entries_duration
before insert or update on public.diary_entries
for each row execute function public.calc_diary_entry_duration();

-- diary_days 자동 생성 (entries INSERT 시 없으면)
-- → 서버 액션에서 upsert로 처리. 트리거 미사용 (가계부 패턴과 일관)
```

### 4.7 RLS

```sql
alter table public.diary_activities enable row level security;
alter table public.diary_quests enable row level security;
alter table public.diary_days enable row level security;
alter table public.diary_entries enable row level security;
alter table public.diary_quest_checks enable row level security;

create policy "own_rows" on public.diary_activities for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_rows" on public.diary_quests for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_rows" on public.diary_days for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_rows" on public.diary_entries for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_rows" on public.diary_quest_checks for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```

### 4.8 시드 데이터 (0007 마이그레이션 끝부분)

```sql
-- 현재 모든 사용자에게 시드 추가 (1인 프로젝트 가정)
-- 활동 라이브러리 6개
insert into public.diary_activities (user_id, name, color, sort_order)
select id, '잠',  '#F5A623', 1 from auth.users
union all select id, '근무', '#E91E63', 2 from auth.users
union all select id, '쉼',  '#4A4A4A', 3 from auth.users
union all select id, '공부', '#7B68EE', 4 from auth.users
union all select id, '운동', '#4FC3F7', 5 from auth.users
union all select id, '외식', '#D0021B', 6 from auth.users
on conflict (user_id, name) do nothing;

-- Daily Quest 5개
insert into public.diary_quests (user_id, name, sort_order, active)
select id, '헬스',                     1, true from auth.users
union all select id, '독서 1시간',                 2, true from auth.users
union all select id, '중국어 회화 및 공부',         3, true from auth.users
union all select id, '자기개발',                   4, true from auth.users
union all select id, '시황 및 자산 체크',           5, true from auth.users
on conflict do nothing;
```

---

## 5. 자연어 파싱

### 5.1 알고리즘

```typescript
// 입력: "드라마0300", "장실에 갖힘0908", "잠0820"
function parseLine(line: string): { activity: string; hhmm: string } | null {
  const m = line.match(/^(.*?)(\d{4})\s*$/)
  if (!m) return null
  const activity = m[1].trim()
  const hhmm = m[2]
  const hh = Number(hhmm.slice(0, 2))
  const mm = Number(hhmm.slice(2, 4))
  if (hh > 23 || mm > 59) return null
  if (!activity) return null
  return { activity, hhmm: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}` }
}
```

### 5.2 시작 시각 추론

```typescript
function parseAllLines(
  textareaInput: string,
  prevDayLastEndTime: string | null  // "23:50:00" 또는 null
): ParsedEntry[] {
  const lines = textareaInput.split("\n").filter((l) => l.trim())
  const entries: ParsedEntry[] = []
  let cursor: string | null = prevDayLastEndTime
    ? addOneMinute(prevDayLastEndTime)  // 전날 마지막 + 1분
    : null

  for (const line of lines) {
    const parsed = parseLine(line)
    if (!parsed) {
      entries.push({ ok: false, line, error: "파싱 실패" })
      continue
    }
    const endTime = `${parsed.hhmm}:00`
    if (cursor === null) {
      // 첫 날 데이터 없으면 시작 시각 미정 → end만 저장, duration=0 처리
      entries.push({ ok: true, start: endTime, end: endTime, activity: parsed.activity, line })
    } else {
      entries.push({ ok: true, start: cursor, end: endTime, activity: parsed.activity, line })
    }
    cursor = addOneMinute(endTime)
  }
  return entries
}
```

### 5.3 자정 넘김

`prevDayLastEndTime`이 `"23:50:00"`이면 `addOneMinute` → `"23:51:00"`. 다음 항목의 end가 `"00:30:00"`이면 end < start. 이런 경우:
- 첫 entry: today date, start=`00:00:00`, end=원래 end
- 어제 추가: yesterday date, start=원래 start, end=`23:59:59`

별도 helper: `splitAcrossMidnight(start, end, todayDate)`.

### 5.4 미리보기

textarea 옆에 실시간 파싱 결과 표시:
```
00:19-03:00 드라마
03:01-08:20 잠
08:21-09:08 장실에 갖힘
...
```

파싱 실패 라인은 빨간 밑줄 + 에러 메시지.

---

## 6. 컴포넌트 구조

### 6.1 신규 파일

| 경로 | 책임 |
|---|---|
| `lib/utils/diary-parse.ts` | parseLine, parseAllLines, addOneMinute, splitAcrossMidnight |
| `lib/utils/diary-date.ts` | isValidDate, getCurrentDate, getPrevDate, getNextDate, formatDateKorean |
| `lib/validators/diary.ts` | Zod schemas (activities, quests, entries, days, quest_checks) |
| `lib/actions/diary-activities.ts` | add/update/delete + upsertByName(name, color) |
| `lib/actions/diary-quests.ts` | add/update/delete/toggleActive |
| `lib/actions/diary-days.ts` | upsertRawInput(date, rawInput) → 파싱·replace entries 트랜잭션 |
| `lib/actions/diary-quest-checks.ts` | toggle(date, quest_id) |
| `app/diary/page.tsx` | redirect to /diary/{today} |
| `app/diary/[date]/page.tsx` | 일별 페이지 server component |
| `app/diary/[date]/not-found.tsx` | 잘못된 날짜 형식 |
| `app/diary/layout.tsx` | 사이드바 + 본문 grid layout |
| `app/diary/settings/layout.tsx` | 설정 페이지 공통 |
| `app/diary/settings/activities/page.tsx` | 활동 라이브러리 관리 |
| `app/diary/settings/quests/page.tsx` | Daily Quest 항목 관리 |
| `components/diary/sidebar/DiarySidebar.tsx` | 좌측 사이드바 (트리 + 설정 + 햄버거) |
| `components/diary/sidebar/DateLink.tsx` | 일자별 행 + ✕ 삭제 (가계부 MonthLink 패턴) |
| `components/diary/day/QuestCheckRow.tsx` | 가로 일렬 5+α 체크박스 |
| `components/diary/day/EntryInput.tsx` | textarea + 실시간 파싱 미리보기 |
| `components/diary/day/Timeline.tsx` | 24×4 CSS Grid 96 셀 (24시간 세로 + 15분 단위) |
| `components/diary/day/TimelineSlot.tsx` | 개별 슬롯 (button + 색상 마스킹 + 활동 라벨) |
| `components/diary/day/ColorPalette.tsx` | 팔레트 popover/sheet (활동 라이브러리 색들 + custom) |
| `components/diary/settings/ActivityRow.tsx` | 활동 라이브러리 인라인 편집 |
| `components/diary/settings/QuestRow.tsx` | Quest 인라인 편집 |

### 6.2 수정 파일

| 경로 | 변경 |
|---|---|
| `app/layout.tsx` 또는 글로벌 헤더 | "일기장" 메뉴 활성 표시 (이미 링크 있음, 동작만 확인) |

---

## 7. 데이터 플로우

### 7.1 일별 페이지 진입

```
/diary → redirect /diary/{getCurrentDate()}
/diary/2026-06-01 → server component
  ├─ fetch diary_days WHERE date='2026-06-01' (raw_input 가져옴)
  ├─ fetch diary_entries WHERE date='2026-06-01' ORDER BY start_time
  ├─ fetch diary_quests WHERE active=true ORDER BY sort_order
  ├─ fetch diary_quest_checks WHERE date='2026-06-01'
  ├─ fetch diary_activities ORDER BY sort_order (팔레트용)
  └─ Promise.all
  → 컴포넌트에 props로 전달
```

### 7.2 시간 로그 입력 → 저장

```
EntryInput (textarea)
  ↓ onChange (debounce 300ms)
  ↓ 클라이언트 파싱 → 미리보기 갱신
  ↓ 사용자가 "저장" 클릭 또는 blur
upsertRawInput(date, rawInput)
  ↓ 서버 액션
  ↓ 1. diary_days upsert (raw_input 갱신)
  ↓ 2. 전날 마지막 end_time 조회 (자정 추론)
  ↓ 3. parseAllLines로 ParsedEntry[] 만듬
  ↓ 4. 자정 넘김 → splitAcrossMidnight
  ↓ 5. DELETE FROM diary_entries WHERE user_id AND date IN (today, 자정넘김된 어제만)
  ↓ 6. INSERT new entries (color는 activity_name으로 라이브러리 조회, 없으면 #D8D8D8)
  ↓ revalidatePath(/diary/[date])
```

### 7.3 슬롯 클릭 → 색칠 → 자동 학습

```
TimelineSlot 클릭
  ↓ ColorPalette 열기 (현 슬롯의 activity_name 추출)
  ↓ 사용자가 색 선택
  ↓ 서버 액션: updateEntryColor(activity_name, color, date)
  ↓ 1. UPDATE diary_entries SET color=$ WHERE user_id AND date AND activity_name=$
  ↓ 2. UPSERT diary_activities (name=$, color=$) ON CONFLICT (user_id, name) DO UPDATE SET color
  ↓ revalidatePath(/diary/[date])
```

### 7.4 Daily Quest 토글

```
QuestCheckRow 체크박스 탭
  ↓ 낙관적 업데이트 (useState)
  ↓ 서버 액션: toggleQuestCheck(date, quest_id)
  ↓ UPSERT diary_quest_checks (user_id, date, quest_id) checked=NOT checked
  ↓ revalidatePath(/diary/[date])
```

---

## 8. 타임라인 시각화 (CSS Grid)

### 8.1 구조

```tsx
<div className="grid grid-cols-1 gap-px bg-neutral-200">
  {/* 24행 × 1열 (시간) */}
  {Array.from({ length: 24 }, (_, h) => (
    <div key={h} className="grid grid-cols-[40px_repeat(4,1fr)] bg-white">
      <div className="text-xs text-neutral-400 tabular-nums">
        {String(h).padStart(2, "0")}
      </div>
      {Array.from({ length: 4 }, (_, q) => {
        // q = 0,1,2,3 = 0분/15분/30분/45분
        const slotStart = h * 60 + q * 15
        const slotEnd = slotStart + 15
        const entry = findEntryAtMinute(entries, slotStart)
        return (
          <TimelineSlot
            key={q}
            entry={entry}
            slotStart={slotStart}
            onClick={() => entry && openPalette(entry)}
          />
        )
      })}
    </div>
  ))}
</div>
```

### 8.2 슬롯 색칠 로직

각 슬롯의 minute 범위 (예: 0:00-0:15) 안에 어느 entry가 걸쳐있는지 계산:
- entry.start ≤ slotEnd AND entry.end > slotStart 이면 그 entry의 color로 마스킹
- 여러 entry가 한 슬롯에 걸치면 (15분 사이에 활동 전환) → 더 많은 분 차지하는 쪽으로

### 8.3 활동명 라벨

슬롯 안에 항상 라벨 표시하면 어수선. PRD §3.1 굿노트 패턴은 "활동의 첫 슬롯에만 라벨". 동일하게:
- entry.start와 일치하는 슬롯에만 활동명 텍스트 표시
- text-[10px] truncate

### 8.4 1080px / 모바일

- 데스크탑: 좌측 시간 라벨 40px + 4×60px (시간당 240px) = 280px 너비, 24시간 → 24행
- 모바일: 좌측 32px + 4×슬롯 (반응형 1fr 분배), 24행

---

## 9. 라우팅·페이지

### 9.1 라우트 트리

```
/diary                              → redirect to /diary/{today}
/diary/[date]                       → 일별 페이지
/diary/settings/activities          → 활동 라이브러리
/diary/settings/quests              → Daily Quest 항목
```

### 9.2 사이드바 (PRD §7.2 의 일부, MVP만)

```
📔 일기
  └ 2026년 ▼
      └ 6월 1일 (오늘) ✕
      └ 5월 30일 ✕
      └ ...

⚙️ 설정
  └ 활동 라이브러리
  └ Daily Quest
```

4영역(일정/백로그/...)은 Phase 2에서 추가.

---

## 10. 회귀 위험

| 영역 | 위험 | 대응 |
|---|---|---|
| 가계부 모듈 | diary 라우트 추가는 가계부에 영향 0 | 회귀 게이트에 가계부 페이지 정상 로드 포함 |
| 사이드바 layout | `app/diary/layout.tsx` 신규 | 기존 가계부 layout과 독립. 단 글로벌 헤더는 공유 |
| Tailwind 클래스 | 신규 컴포넌트의 v3 문법 준수 (`max-h-[var(--x)]`) | spec §3 ADR-021 교훈 (v4 문법 금지) |
| RLS | 신규 5개 테이블 모두 적용 | 마이그레이션에 포함 |
| Recharts | diary는 차트 미사용 | 변경 없음 |
| vaul | 모바일 팔레트에서 재사용 | 가계부 Sheet 패턴 답습 (Portal 제거된 Select wrapper 그대로 동작) |

---

## 11. 테스트 게이트 (Manual)

### Gate A: Build + Type
- `pnpm run build` 통과
- `pnpm exec tsc --noEmit` 0 error
- `pnpm exec eslint .` Phase 영역 0 error

### Gate B: 마이그레이션 + 시드
- 0007 적용 성공
- `diary_activities`에 6개 시드 데이터 들어옴
- `diary_quests`에 5개 시드 데이터 들어옴
- RLS로 다른 사용자 데이터 안 보임 (sssong1993 외엔 데이터 0)

### Gate C: 활동 라이브러리·Quest 설정
- `/diary/settings/activities` 진입 → 시드 6개 표시
- 활동 추가 / 색 변경 / 삭제 / 정렬
- `/diary/settings/quests` 진입 → 시드 5개 표시. 추가/활성 토글/삭제/정렬

### Gate D: 일별 페이지 입력 + 파싱
- `/diary` 진입 → 오늘 일자로 redirect
- textarea에 `개발0018\n드라마0300\n잠0820` 입력
- 실시간 미리보기 정확:
  - `??:??-00:18 개발` (전날 데이터 없으면 시작 미정)
  - `00:19-03:00 드라마`
  - `03:01-08:20 잠`
- 저장 → diary_entries 3 row 생성. raw_input 보존.

### Gate E: 타임라인 시각화
- 저장 직후 24×4 그리드 표시
- 각 활동 구간이 해당 색으로 마스킹 (시드 활동은 시드 색, 미등록 활동은 #D8D8D8)
- 활동 첫 슬롯에 활동명 라벨
- 비어있는 슬롯은 흰색

### Gate F: 슬롯 클릭 색칠
- 슬롯 클릭 → 팔레트 열림 (데스크탑 popover / 모바일 vaul 시트)
- 색 선택 → 해당 활동의 모든 슬롯 색 즉시 변경
- `diary_activities` 테이블 확인: 그 활동의 색 UPSERT됨
- 다음 날 같은 활동 입력 시 자동으로 등록된 색 적용

### Gate G: Daily Quest
- 5+α 체크박스 가로 일렬 표시
- 탭 → 체크. `diary_quest_checks` row 생성/갱신.
- 새로고침 후 상태 유지

### Gate H: 사이드바 + 자정 넘김
- 사이드바에 entries 있는 날짜만 표시 (가나다순 = 날짜 내림차순)
- 일자 ✕ 삭제 → entries + quest_checks + days 모두 사라짐
- 자정 넘김 (예: 어제 23:50 → 오늘 00:30 입력) 시 어제와 오늘 양쪽에 row

### Gate I: 모바일 반응형 (430px viewport)
- 햄버거 사이드바
- textarea 큰 영역, iOS 키보드 안 끊김
- 타임라인 슬롯 탭 → vaul 시트 (가계부 패턴 일관)

---

## 12. ADR (Notion 업데이트 필요)

| ID | 결정 | 이유 |
|---|---|---|
| **ADR-026** | 일기장 모듈 MVP 시작 — 5 테이블 + 자연어 파싱 + 타임라인 + Daily Quest | PRD §1, §9 Phase 1 |
| **ADR-027** | 활동 스냅샷 패턴 (가계부 답습) | 활동 색 변경 시 과거 entries 색 불변 |
| **ADR-028** | URL `/diary/[date]` 단일 세그먼트 | 가계부 `/budget/[ym]` 일관성 |
| **ADR-029** | 타임라인 시각화 = CSS Grid 96 셀 (SVG 미사용) | 단순성·접근성·click handler |
| **ADR-030** | 시간 로그 = textarea 전체 편집 → 저장 시 entries replace | 줄바꿈 자연어 한 덩어리, row 편집 UX 복잡 |
| **ADR-031** | quest_id는 FK (스냅샷 미적용) | quest name은 사용자 정의, 변경 시 과거 보존 가치 낮음 |
| **ADR-032** | Phase 1 MVP에 4영역(일정/백로그/...) 제외 | 작업량 분산 (Phase 2로) |
| **ADR-033** | 시드 데이터를 마이그레이션에 INSERT (1인 가정) | 가계부 카테고리 시드 패턴 동일 |

---

## 13. 작업 분해 (Plan 단위 미리보기)

1. 0007 마이그레이션 (5 테이블 + RLS + 트리거 + 시드)
2. diary-parse.ts + diary-date.ts 유틸 + unit test 시나리오 (manual 검증용)
3. validators/diary.ts (Zod)
4. lib/actions/diary-activities.ts
5. lib/actions/diary-quests.ts
6. lib/actions/diary-days.ts (upsertRawInput, 자정 처리 포함)
7. lib/actions/diary-quest-checks.ts
8. app/diary/page.tsx (redirect to today)
9. app/diary/layout.tsx (사이드바)
10. components/diary/sidebar/* (Sidebar + DateLink)
11. components/diary/day/QuestCheckRow.tsx
12. components/diary/day/EntryInput.tsx (textarea + 미리보기)
13. components/diary/day/Timeline.tsx + TimelineSlot.tsx (CSS Grid)
14. components/diary/day/ColorPalette.tsx
15. app/diary/[date]/page.tsx (data fetch + 조합)
16. app/diary/settings/activities/page.tsx + ActivityRow.tsx
17. app/diary/settings/quests/page.tsx + QuestRow.tsx
18. Manual gates A~I 실행
19. 커밋 + Notion ADR 알림

상세 step-by-step plan은 `docs/superpowers/plans/2026-06-01-diary-mvp.md` 에 별도 작성.
