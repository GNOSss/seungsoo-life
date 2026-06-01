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

  const sessionExIds = (sessionExs ?? []).map((s) => s.id)
  const { data: sets } = sessionExIds.length > 0
    ? await supabase
        .from("workout_sets")
        .select("session_exercise_id, weight_kg, reps, set_type, completed")
        .in("session_exercise_id", sessionExIds)
    : { data: [] as Array<{
        session_exercise_id: string
        weight_kg: number | null
        reps: number | null
        set_type: "warmup" | "working" | "failure"
        completed: boolean
      }> }

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
