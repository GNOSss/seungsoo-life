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
