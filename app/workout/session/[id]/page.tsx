import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { SessionHeader } from "@/components/workout/session/SessionHeader"
import { AddExerciseSheet } from "@/components/workout/session/AddExerciseSheet"
import { FinishButton } from "@/components/workout/session/FinishButton"
import { ExerciseBlock } from "@/components/workout/session/ExerciseBlock"
import type { SetRowData } from "@/components/workout/session/SetRow"

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: session } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (!session) notFound()

  const { data: sessionExs } = await supabase
    .from("workout_session_exercises")
    .select("id, exercise_name, body_part, category, sort_order")
    .eq("session_id", id)
    .order("sort_order", { ascending: true })

  const sessionExIds = (sessionExs ?? []).map((se) => se.id)
  const { data: allSets } = sessionExIds.length > 0
    ? await supabase
        .from("workout_sets")
        .select("id, session_exercise_id, set_number, set_type, weight_kg, reps, completed, sort_order")
        .in("session_exercise_id", sessionExIds)
        .order("sort_order", { ascending: true })
    : { data: [] as Array<{
        id: string
        session_exercise_id: string
        set_number: number
        set_type: "warmup" | "working" | "failure"
        weight_kg: number | null
        reps: number | null
        completed: boolean
        sort_order: number
      }> }

  const { data: allExercises } = await supabase
    .from("workout_exercises")
    .select("id, name, body_part")
    .order("body_part")
    .order("name")

  const setsByExercise = new Map<string, SetRowData[]>()
  for (const s of allSets ?? []) {
    if (!setsByExercise.has(s.session_exercise_id)) setsByExercise.set(s.session_exercise_id, [])
    setsByExercise.get(s.session_exercise_id)!.push({
      id: s.id,
      set_number: s.set_number,
      set_type: s.set_type,
      weight_kg: s.weight_kg,
      reps: s.reps,
      completed: s.completed,
    })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <div className="flex items-start justify-between">
        <SessionHeader
          title={session.routine_name ?? "빈 워크아웃"}
          date={session.date}
          startedAt={session.started_at}
        />
        <FinishButton sessionId={session.id} />
      </div>
      <div className="space-y-3">
        {(sessionExs ?? []).map((se) => (
          <ExerciseBlock
            key={se.id}
            sessionExercise={se}
            sets={setsByExercise.get(se.id) ?? []}
            sessionId={session.id}
          />
        ))}
      </div>
      <AddExerciseSheet sessionId={session.id} allExercises={allExercises ?? []} />
    </div>
  )
}
