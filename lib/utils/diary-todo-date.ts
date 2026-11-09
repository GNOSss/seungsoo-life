const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const

export function getKoreanWeekday(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  return WEEKDAY_LABELS[date.getDay()]
}

export function formatYymmdd(dateStr: string): string {
  const [y, m, d] = dateStr.split("-")
  return `${y.slice(2)}.${m}.${d}`
}

export function formatHm(timeStr: string): string {
  return timeStr.slice(0, 5)
}

export function isPastDate(dateStr: string): boolean {
  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
}
