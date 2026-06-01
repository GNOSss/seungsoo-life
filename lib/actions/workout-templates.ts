"use server"

import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { FolderInputSchema, RoutineInputSchema, RoutineExerciseInputSchema } from "@/lib/validators/workout"

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string }

export async function createFolder(input: z.infer<typeof FolderInputSchema>): Promise<Result<{ id: string }>> {
  const parsed = FolderInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "로그인 필요" }
  const { data, error } = await supabase
    .from("workout_template_folders")
    .insert({ user_id: user.id, name: parsed.data.name })
    .select("id")
    .single()
  if (error) return { ok: false, error: error.message }
  revalidatePath("/workout/templates")
  revalidatePath("/workout/start")
  return { ok: true, data: { id: data.id } }
}

export async function deleteFolder(id: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from("workout_template_folders").delete().eq("id", id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/workout/templates")
  revalidatePath("/workout/start")
  return { ok: true }
}

export async function createRoutine(input: z.infer<typeof RoutineInputSchema>): Promise<Result<{ id: string }>> {
  const parsed = RoutineInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "로그인 필요" }
  const { data, error } = await supabase
    .from("workout_routines")
    .insert({ user_id: user.id, folder_id: parsed.data.folder_id, name: parsed.data.name })
    .select("id")
    .single()
  if (error) return { ok: false, error: error.message }
  revalidatePath("/workout/templates")
  revalidatePath("/workout/start")
  return { ok: true, data: { id: data.id } }
}

export async function deleteRoutine(id: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from("workout_routines").delete().eq("id", id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/workout/templates")
  revalidatePath("/workout/start")
  return { ok: true }
}

export async function addRoutineExercise(input: z.infer<typeof RoutineExerciseInputSchema>): Promise<Result> {
  const parsed = RoutineExerciseInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }
  const supabase = await createClient()
  const { data: max } = await supabase
    .from("workout_routine_exercises")
    .select("sort_order")
    .eq("routine_id", parsed.data.routine_id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle()
  const next = (max?.sort_order ?? -1) + 1
  const { error } = await supabase.from("workout_routine_exercises").insert({
    routine_id: parsed.data.routine_id,
    exercise_id: parsed.data.exercise_id,
    default_sets: parsed.data.default_sets,
    sort_order: next,
  })
  if (error) return { ok: false, error: error.message }
  revalidatePath("/workout/templates")
  return { ok: true }
}

export async function removeRoutineExercise(id: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from("workout_routine_exercises").delete().eq("id", id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/workout/templates")
  return { ok: true }
}
