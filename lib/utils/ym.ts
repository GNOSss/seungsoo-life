/**
 * year_month (YYYY-MM) 유틸. 모두 순수 함수.
 * 가계부 모듈의 모든 월 식별자는 이 형식 사용.
 */

/** YYYY-MM 형식 검증 (월은 01-12) */
export function isValidYm(ym: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(ym)
}

/** 현재 년월 (KST 기준). Vercel UTC 환경 안전. */
export function getCurrentYm(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  })
  // en-CA locale은 ISO-like 형식 "2026-05" 형태로 출력
  return formatter.format(new Date())
}

/** "2026-05" → { year: 2026, month: 5 } */
export function parseYm(ym: string): { year: number; month: number } {
  const [y, m] = ym.split("-")
  return { year: Number(y), month: Number(m) }
}

/** 다음 월 ("2026-12" → "2027-01") */
export function getNextYm(ym: string): string {
  const { year, month } = parseYm(ym)
  const next =
    month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
  return `${next.year}-${String(next.month).padStart(2, "0")}`
}

/** 직전 월 ("2026-01" → "2025-12") */
export function getPrevYm(ym: string): string {
  const { year, month } = parseYm(ym)
  const prev =
    month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
  return `${prev.year}-${String(prev.month).padStart(2, "0")}`
}

/** "2026-05" → "2026년 5월" */
export function formatYmKorean(ym: string): string {
  const { year, month } = parseYm(ym)
  return `${year}년 ${month}월`
}
