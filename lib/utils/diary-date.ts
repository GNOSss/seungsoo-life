/**
 * YYYY-MM-DD 형식 날짜 유틸. 모두 순수 함수.
 * 일기장 모듈의 모든 날짜 식별자는 이 형식 사용.
 */

/** YYYY-MM-DD 형식 검증 */
export function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const d = new Date(`${date}T00:00:00`)
  if (Number.isNaN(d.getTime())) return false
  return d.toISOString().slice(0, 10) === date
}

/** 현재 날짜 (KST 기준). Vercel UTC 환경 안전. */
export function getCurrentDate(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  return formatter.format(new Date())
}

/** 다음 날 ("2026-06-30" → "2026-07-01") */
export function getNextDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

/** 직전 날 */
export function getPrevDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

/** "2026-06-01" → "2026년 6월 1일 (월)" */
export function formatDateKorean(date: string): string {
  const d = new Date(`${date}T00:00:00`)
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  const dow = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()]
  return `${y}년 ${m}월 ${day}일 (${dow})`
}

/** "2026-06-01" → { year, month, day } */
export function parseDate(date: string): {
  year: number
  month: number
  day: number
} {
  const [y, m, d] = date.split("-")
  return { year: Number(y), month: Number(m), day: Number(d) }
}

/** date가 속한 주의 월요일 (월요일 시작 주 기준, 한국식). */
export function getMondayOf(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  const dow = d.getUTCDay() // 0=일, 1=월, ..., 6=토
  const offset = dow === 0 ? 6 : dow - 1
  d.setUTCDate(d.getUTCDate() - offset)
  return d.toISOString().slice(0, 10)
}

/** 월요일 → 그 주의 7일 배열 (월, 화, ..., 일) */
export function getWeekDays(monday: string): string[] {
  const result: string[] = []
  const d = new Date(`${monday}T00:00:00Z`)
  for (let i = 0; i < 7; i++) {
    result.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return result
}

export function getNextMonday(monday: string): string {
  const d = new Date(`${monday}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 7)
  return d.toISOString().slice(0, 10)
}

export function getPrevMonday(monday: string): string {
  const d = new Date(`${monday}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 7)
  return d.toISOString().slice(0, 10)
}

/** "6/1 ~ 6/7" (월요일 기준 주 범위) */
export function formatWeekRange(monday: string): string {
  const days = getWeekDays(monday)
  const m = parseDate(days[0])
  const s = parseDate(days[6])
  return `${m.month}/${m.day} ~ ${s.month}/${s.day}`
}

/** 한글 요일 글자 (월/화/...) */
export function getDayOfWeekKorean(date: string): string {
  const d = new Date(`${date}T00:00:00`)
  return ["일", "월", "화", "수", "목", "금", "토"][d.getDay()]
}
