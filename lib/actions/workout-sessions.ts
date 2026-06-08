"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string }

export async function startEmptySession(): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "로그인 필요" }
  const { data, error } = await supabase
    .from("workout_sessions")
    .insert({ user_id: user.id })
    .select("id")
    .single()
  if (error) return { error: error.message }
  return { id: data.id }
}

export async function startSessionFromRoutine(routine_id: string): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "로그인 필요" }

  const { data: routine, error: rErr } = await supabase
    .from("workout_routines")
    .select("id, name, folder_id, workout_template_folders!inner(name)")
    .eq("id", routine_id)
    .maybeSingle()
  if (rErr || !routine) return { error: rErr?.message ?? "루틴 없음" }

  const folderName = (routine as unknown as { workout_template_folders: { name: string } | null }).workout_template_folders?.name ?? null

  const { data: session, error: sErr } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: user.id,
      routine_id: routine.id,
      routine_name: routine.name,
      folder_name: folderName,
    })
    .select("id")
    .single()
  if (sErr) return { error: sErr.message }

  const { data: routineExs } = await supabase
    .from("workout_routine_exercises")
    .select("exercise_id, default_sets, sort_order, workout_exercises!inner(name, body_part, category)")
    .eq("routine_id", routine_id)
    .order("sort_order", { ascending: true })

  if (routineExs && routineExs.length > 0) {
    const sessionExRows = routineExs.map((re) => {
      const ex = (re as unknown as { workout_exercises: { name: string; body_part: string; category: string } }).workout_exercises
      return {
        session_id: session.id,
        exercise_id: re.exercise_id,
        exercise_name: ex.name,
        body_part: ex.body_part,
        category: ex.category,
        sort_order: re.sort_order,
      }
    })
    const { data: insertedSE, error: seErr } = await supabase
      .from("workout_session_exercises")
      .insert(sessionExRows)
      .select("id, sort_order")
    if (seErr) return { error: seErr.message }

    const setRows: Array<{
      session_exercise_id: string
      set_number: number
      set_type: "working"
      sort_order: number
    }> = []
    insertedSE?.forEach((se) => {
      const defaultSets = routineExs[se.sort_order]?.default_sets ?? 3
      for (let i = 0; i < defaultSets; i++) {
        setRows.push({
          session_exercise_id: se.id,
          set_number: i + 1,
          set_type: "working",
          sort_order: i,
        })
      }
    })
    if (setRows.length > 0) {
      await supabase.from("workout_sets").insert(setRows)
    }
  }

  return { id: session.id }
}

export async function addExerciseToSession(
  session_id: string,
  exercise_id: string
): Promise<Result<{ session_exercise_id: string }>> {
  const supabase = await createClient()

  const { data: ex } = await supabase
    .from("workout_exercises")
    .select("name, body_part, category")
    .eq("id", exercise_id)
    .maybeSingle()
  if (!ex) return { ok: false, error: "운동 없음" }

  const { data: max } = await supabase
    .from("workout_session_exercises")
    .select("sort_order")
    .eq("session_id", session_id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle()
  const next = (max?.sort_order ?? -1) + 1

  const { data: insertedSE, error: seErr } = await supabase
    .from("workout_session_exercises")
    .insert({
      session_id,
      exercise_id,
      exercise_name: ex.name,
      body_part: ex.body_part,
      category: ex.category,
      sort_order: next,
    })
    .select("id")
    .single()
  if (seErr) return { ok: false, error: seErr.message }

  await supabase.from("workout_sets").insert({
    session_exercise_id: insertedSE.id,
    set_number: 1,
    set_type: "working",
    sort_order: 0,
  })

  revalidatePath(`/workout/session/${session_id}`)
  return { ok: true, data: { session_exercise_id: insertedSE.id } }
}

export async function removeExerciseFromSession(session_exercise_id: string, session_id: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from("workout_session_exercises").delete().eq("id", session_exercise_id)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/workout/session/${session_id}`)
  return { ok: true }
}

/** 완료. completed=true 세트가 0개면 빈 세션으로 간주하고 삭제 후 discarded 반환. */
export async function finishSession(
  session_id: string
): Promise<Result<{ discarded: boolean }>> {
  const supabase = await createClient()

  // completed 세트 수 확인
  const { count } = await supabase
    .from("workout_sets")
    .select("id", { count: "exact", head: true })
    .eq("completed", true)
    .in(
      "session_exercise_id",
      (
        await supabase
          .from("workout_session_exercises")
          .select("id")
          .eq("session_id", session_id)
      ).data?.map((r) => r.id) ?? []
    )

  // 완료된 세트 없으면 빈 세션 — 삭제
  if ((count ?? 0) === 0) {
    await supabase.from("workout_sessions").delete().eq("id", session_id)
    revalidatePath("/workout/start")
    return { ok: true, data: { discarded: true } }
  }

  const { error } = await supabase
    .from("workout_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", session_id)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/workout/session/${session_id}`)
  return { ok: true, data: { discarded: false } }
}

export async function deleteSession(session_id: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from("workout_sessions").delete().eq("id", session_id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/workout/start")
  return { ok: true }
}
