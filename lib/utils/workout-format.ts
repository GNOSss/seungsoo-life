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
