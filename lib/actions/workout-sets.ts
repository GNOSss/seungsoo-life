"use server"

import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { SetTypeEnum } from "@/lib/validators/workout"

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string }

export async function addSet(session_exercise_id: string, session_id: string): Promise<Result<{ id: string }>> {
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from("workout_sets")
    .select("set_number, sort_order")
    .eq("session_exercise_id", session_exercise_id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextNum = (existing?.set_number ?? 0) + 1
  const nextOrder = (existing?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from("workout_sets")
    .insert({
      session_exercise_id,
      set_number: nextNum,
      set_type: "working",
      sort_order: nextOrder,
    })
    .select("id")
    .single()
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/workout/session/${session_id}`)
  return { ok: true, data: { id: data.id } }
}

const UpdateSetSchema = z.object({
  weight_kg: z.number().nullable().optional(),
  reps: z.number().int().min(0).nullable().optional(),
  set_type: SetTypeEnum.optional(),
  completed: z.boolean().optional(),
})

export async function updateSet(
  id: string,
  session_id: string,
  patch: z.infer<typeof UpdateSetSchema>
): Promise<Result> {
  const parsed = UpdateSetSchema.safeParse(patch)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }
  const supabase = await createClient()
  const { error } = await supabase.from("workout_sets").update(parsed.data).eq("id", id)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/workout/session/${session_id}`)
  return { ok: true }
}

export async function deleteSet(id: string, session_id: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from("workout_sets").delete().eq("id", id)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/workout/session/${session_id}`)
  return { ok: true }
}

export async function findPreviousSet(
  exercise_name: string,
  set_number: number,
  current_session_id: string
): Promise<{ weight_kg: number | null; reps: number | null } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from("workout_sets")
    .select(`
      weight_kg, reps,
      workout_session_exercises!inner (
        exercise_name,
        workout_sessions!inner ( id, started_at, user_id )
      )
    `)
    .eq("set_number", set_number)
    .eq("completed", true)
    .eq("workout_session_exercises.exercise_name", exercise_name)
    .eq("workout_session_exercises.workout_sessions.user_id", user.id)
    .neq("workout_session_exercises.workout_sessions.id", current_session_id)
    .order("workout_session_exercises(workout_sessions(started_at))", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null
  return { weight_kg: data.weight_kg, reps: data.reps }
}
