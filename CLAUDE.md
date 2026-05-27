# 작업 규칙 (CLAUDE.md)

> 이 파일은 Claude Code가 자동으로 읽고 따른다.
> 프로젝트 루트에 두기만 하면 됨.
> 수정·갱신은 자유롭게 가능.

---

## 프로젝트 개요

- **이름**: 승수 라이프 (통합 PWA)
- **첫 모듈**: 가계부 (Phase 1)
- **다음 모듈**: 일기장 → 운동기록 → 4순위~
- **소유자**: 승수 (1993년생, 개발 학습 단계)

---

## 기술 스택

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **UI**: shadcn/ui
- **PWA**: next-pwa 또는 Serwist
- **Backend/DB**: Supabase (Postgres + Auth + RLS + Trigger)
- **배포**: Vercel
- **차트**: Recharts
- **날짜**: date-fns
- **상태관리**: Zustand
- **폼**: React Hook Form + Zod
- **엑셀 import**: SheetJS (xlsx) — Phase 3에서

---

## Notion 동기화

이 프로젝트의 PRD는 Notion에 있다:

- **마스터플랜**: https://www.notion.so/35acf376124680498e8ecca4a28566f3
- **가계부 모듈 PRD**: https://www.notion.so/36dcf376124681d1aed1cc5f7212ab2f

### 핵심 원칙

> **코드와 PRD가 서로 다르면 코드가 진실이다.**

PRD는 초안. 빌드하다 보면 결정이 바뀐다. 그때 PRD를 수정하지 말고
가계부 모듈 페이지의 "14. 결정 로그 (ADR)" 섹션에 추가한다.

### PRD와 다른 결정을 내려야 할 때

1. 일단 결정하고 코드 진행
2. 작업 세션 끝날 때 사용자에게 명시적으로 알림:
   ```
   ⚠️ Notion 업데이트 필요: ADR-XXX
   - 결정: ___
   - 이유: ___
   - 영향: ___
   ```
3. 사용자가 Claude Chat으로 이동해서 Notion 업데이트 요청
4. Chat이 가계부 모듈 페이지에 ADR 추가

### 적용 안 되는 사소한 변경 (ADR 불필요)

다음은 그냥 진행:
- 변수명 변경 (안 보이는 곳)
- 코드 리팩터링
- 버그 수정
- 주석 추가
- 의존성 버전 업데이트

### 적용되는 변경 (ADR 필수)

다음은 반드시 ADR 남기기:
- DB 스키마 변경 (컬럼 이름·타입·관계)
- 화면 구조 변경 (탭/페이지 추가·제거)
- 비즈니스 로직 변경 (계산식, 구분 기준 등)
- 기술 스택 변경
- UX 결정 변경 (5개 결정사항 중 무엇이든)

---

## 절대 지킬 규칙 (가계부 모듈)

### 1. 스냅샷 패턴

`transactions` 테이블에 `category_id` 같은 FK 금지.
반드시 값(TEXT) 자체를 저장:

```sql
-- ❌ 절대 금지
transactions.category_id → categories.id (FK)

-- ✅ 반드시 이렇게
transactions.category_1st (TEXT) = "식비"
transactions.category_2nd (TEXT) = "배달식사"
transactions.payment_method (TEXT) = "보라삼성"
```

이유: 설정에서 카테고리 수정해도 과거 거래는 그대로 유지되어야 함.

### 2. 잔고 연쇄 갱신

과거 월의 `is_paid` 변경 시 → 이후 모든 월의 `monthly_summaries` 자동 재계산.
PostgreSQL 트리거로 구현.

### 3. 고정/비고정 정렬 준수

```
[고정 그룹] 좌측 4px 컬러 보더 ↑
  → 1차 카테고리 가나다순 → 2차 가나다순 → 날짜순

[비고정 그룹] 보더 없음 ↓
  → 날짜순
```

### 4. 메인 자동 이동

접속 시 현재 년월 페이지로 자동 이동.

### 5. 다음 월 생성 버튼

우측 상단, **다음 월 페이지가 없을 때만** 표시.
클릭 시 빈 페이지 + 고정지출 자동 입력.

---

## 입력 UX 제약조건

- 인라인 테이블, 키보드 중심
- Tab/Enter로 다음 셀/행 이동
- 자동완성 적극적
- 시간 4자리 입력 → HH:MM 자동 파싱 (일기장 모듈용)
- 모바일: 세로 배치, 일부 컬럼 접기

---

## 작업 흐름

1. **새 기능 시작 전**: Notion 가계부 모듈 페이지 fetch해서 PRD + 최신 ADR 확인
2. **빌드 중**: 코드 우선, PRD와 다르면 ADR 메모 (커밋 메시지에 [ADR-XXX])
3. **세션 종료 전**: 사용자에게 Notion 업데이트 알림 (해당 시)

---

## Git 컨벤션

- 커밋 메시지: `feat: 거래 입력 인라인 테이블 구현`
- ADR 관련: `feat: is_recurring 컬럼 추가 [ADR-001]`
- 매일 최소 1회 커밋
- main 브랜치 직접 작업 OK (1인 프로젝트)

---

## 보안

- Supabase RLS 모든 테이블에 적용 (`user_id = auth.uid()`)
- 환경변수는 `.env.local` (Git 제외)
- Supabase anon key만 클라이언트, service key는 서버만
