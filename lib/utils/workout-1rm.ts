/** Epley 공식: weight × (1 + reps/30). weight 또는 reps 없으면 null. */
export function estimated1RM(weight: number | null, reps: number | null): number | null {
  if (weight == null || reps == null || reps <= 0) return null
  return Number((weight * (1 + reps / 30)).toFixed(2))
}
