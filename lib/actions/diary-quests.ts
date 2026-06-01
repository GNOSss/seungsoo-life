"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  AddDiaryQuestSchema,
  UpdateDiaryQuestSchema,
  DeleteDiaryQuestSchema,
  type AddDiaryQuestInput,
  type UpdateDiaryQuestInput,
  type DeleteDiaryQuestInput,
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

export async function addDiaryQuest(
  input: AddDiaryQuestInput
): Promise<Result> {
  const parsed = AddDiaryQuestSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if (!ctx.ok) return { ok: false, error: ctx.error }
  const { supabase, user } = ctx

  const { data: maxRow } = await supabase
    .from("diary_quests")
    .select("sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextSort = (maxRow?.sort_order ?? 0) + 1

  const { error } = await supabase.from("diary_quests").insert({
    user_id: user.id,
    name: parsed.data.name,
    sort_order: nextSort,
    active: true,
  })
  if (error) return { ok: false, error: error.message }
  revalidatePath("/diary/settings/quests")
  revalidatePath("/diary", "layout")
  return { ok: true }
}

export async function updateDiaryQuest(
  input: UpdateDiaryQuestInput
): Promise<Result> {
  const parsed = UpdateDiaryQuestSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if (!ctx.ok) return { ok: false, error: ctx.error }
  const { supabase } = ctx

  const patch: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) patch.name = parsed.data.name
  if (parsed.data.active !== undefined) patch.active = parsed.data.active
  if (Object.keys(patch).length === 0) return { ok: true }

  const { error } = await supabase
    .from("diary_quests")
    .update(patch)
    .eq("id", parsed.data.id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/diary/settings/quests")
  revalidatePath("/diary", "layout")
  return { ok: true }
}

export async function deleteDiaryQuest(
  input: DeleteDiaryQuestInput
): Promise<Result> {
  const parsed = DeleteDiaryQuestSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if (!ctx.ok) return { ok: false, error: ctx.error }
  const { supabase } = ctx

  const { error } = await supabase
    .from("diary_quests")
    .delete()
    .eq("id", parsed.data.id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/diary/settings/quests")
  revalidatePath("/diary", "layout")
  return { ok: true }
}
