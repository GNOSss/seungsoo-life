"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  AddDiaryActivitySchema,
  UpdateDiaryActivitySchema,
  DeleteDiaryActivitySchema,
  UpsertActivityColorByNameSchema,
  type AddDiaryActivityInput,
  type UpdateDiaryActivityInput,
  type DeleteDiaryActivityInput,
  type UpsertActivityColorByNameInput,
} from "@/lib/validators/diary"

type Result = { ok: true } | { ok: false; error: string }

type AuthedClient =
  | { ok: false; error: string }
  | {
      ok: true
      supabase: Awaited<ReturnType<typeof createClient>>
      user: NonNullable<
        Awaited<
          ReturnType<Awaited<ReturnType<typeof createClient>>["auth"]["getUser"]>
        >["data"]["user"]
      >
    }

async function getAuthedClient(): Promise<AuthedClient> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "로그인 필요" }
  return { ok: true, supabase, user }
}

export async function addDiaryActivity(
  input: AddDiaryActivityInput
): Promise<Result> {
  const parsed = AddDiaryActivitySchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if (!ctx.ok) return { ok: false, error: ctx.error }
  const { supabase, user } = ctx

  const { data: maxRow } = await supabase
    .from("diary_activities")
    .select("sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextSort = (maxRow?.sort_order ?? 0) + 1

  const { error } = await supabase.from("diary_activities").insert({
    user_id: user.id,
    name: parsed.data.name,
    color: parsed.data.color,
    sort_order: nextSort,
  })
  if (error) return { ok: false, error: error.message }
  revalidatePath("/diary/settings/activities")
  revalidatePath("/diary", "layout")
  return { ok: true }
}

export async function updateDiaryActivity(
  input: UpdateDiaryActivityInput
): Promise<Result> {
  const parsed = UpdateDiaryActivitySchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if (!ctx.ok) return { ok: false, error: ctx.error }
  const { supabase } = ctx

  const patch: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) patch.name = parsed.data.name
  if (parsed.data.color !== undefined) patch.color = parsed.data.color
  if (Object.keys(patch).length === 0) return { ok: true }

  const { error } = await supabase
    .from("diary_activities")
    .update(patch)
    .eq("id", parsed.data.id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/diary/settings/activities")
  revalidatePath("/diary", "layout")
  return { ok: true }
}

export async function deleteDiaryActivity(
  input: DeleteDiaryActivityInput
): Promise<Result> {
  const parsed = DeleteDiaryActivitySchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if (!ctx.ok) return { ok: false, error: ctx.error }
  const { supabase } = ctx

  const { error } = await supabase
    .from("diary_activities")
    .delete()
    .eq("id", parsed.data.id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/diary/settings/activities")
  revalidatePath("/diary", "layout")
  return { ok: true }
}

export async function upsertActivityColorByName(
  input: UpsertActivityColorByNameInput & { date?: string }
): Promise<Result> {
  const parsed = UpsertActivityColorByNameSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if (!ctx.ok) return { ok: false, error: ctx.error }
  const { supabase, user } = ctx

  const { data: existing } = await supabase
    .from("diary_activities")
    .select("id, sort_order")
    .eq("user_id", user.id)
    .eq("name", parsed.data.name)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from("diary_activities")
      .update({ color: parsed.data.color })
      .eq("id", existing.id)
    if (error) return { ok: false, error: error.message }
  } else {
    const { data: maxRow } = await supabase
      .from("diary_activities")
      .select("sort_order")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle()
    const nextSort = (maxRow?.sort_order ?? 0) + 1
    const { error } = await supabase.from("diary_activities").insert({
      user_id: user.id,
      name: parsed.data.name,
      color: parsed.data.color,
      sort_order: nextSort,
    })
    if (error) return { ok: false, error: error.message }
  }

  if (input.date) {
    const { error } = await supabase
      .from("diary_entries")
      .update({ color: parsed.data.color })
      .eq("user_id", user.id)
      .eq("date", input.date)
      .eq("activity_name", parsed.data.name)
    if (error) return { ok: false, error: error.message }
    revalidatePath(`/diary/${input.date}`)
  }
  revalidatePath("/diary/settings/activities")
  revalidatePath("/diary", "layout")
  return { ok: true }
}
