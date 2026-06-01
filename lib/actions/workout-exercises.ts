"use server"

import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { ExerciseInputSchema } from "@/lib/validators/workout"

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string }

export async function createExercise(input: z.infer<typeof ExerciseInputSchema>): Promise<Result<{ id: string }>> {
  const parsed = ExerciseInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "로그인 필요" }

  const { data, error } = await supabase
    .from("workout_exercises")
    .insert({ user_id: user.id, ...parsed.data })
    .select("id")
    .single()

  if (error) return { ok: false, error: error.message }
  revalidatePath("/workout/exercises")
  revalidatePath("/workout/templates")
  return { ok: true, data: { id: data.id } }
}

export async function updateExercise(
  id: string,
  patch: Partial<z.infer<typeof ExerciseInputSchema>>
): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from("workout_exercises").update(patch).eq("id", id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/workout/exercises")
  revalidatePath("/workout/templates")
  return { ok: true }
}

export async function deleteExercise(id: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from("workout_exercises").delete().eq("id", id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/workout/exercises")
  return { ok: true }
}
