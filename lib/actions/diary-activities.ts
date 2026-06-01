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
import { findMatchingLib, parseKeywords } from "@/lib/utils/diary-color-match"

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

  // 1. 키워드 매칭으로 라이브러리 행 찾기 (name = 콤마 구분 키워드 리스트)
  const { data: allLibs } = await supabase
    .from("diary_activities")
    .select("id, name, color, sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true })
  const libs = allLibs ?? []
  const matched = findMatchingLib(parsed.data.name, libs)

  // 2. UPDATE existing or INSERT new
  let affectedKeywords: string[]
  if (matched) {
    const { error } = await supabase
      .from("diary_activities")
      .update({ color: parsed.data.color })
      .eq("id", matched.id)
    if (error) return { ok: false, error: error.message }
    affectedKeywords = parseKeywords(matched.name)
  } else {
    const maxSort = libs.length > 0 ? libs[libs.length - 1].sort_order : 0
    const { error } = await supabase.from("diary_activities").insert({
      user_id: user.id,
      name: parsed.data.name,
      color: parsed.data.color,
      sort_order: maxSort + 1,
    })
    if (error) return { ok: false, error: error.message }
    affectedKeywords = parseKeywords(parsed.data.name)
  }

  // 3. 해당 날짜의 entries 중 affected keywords 중 하나라도 포함하는 활동명의 색 갱신
  if (input.date && affectedKeywords.length > 0) {
    const { data: entries } = await supabase
      .from("diary_entries")
      .select("id, activity_name")
      .eq("user_id", user.id)
      .eq("date", input.date)
    const matchingIds = (entries ?? [])
      .filter((e) => affectedKeywords.some((kw) => e.activity_name.includes(kw)))
      .map((e) => e.id)
    if (matchingIds.length > 0) {
      const { error } = await supabase
        .from("diary_entries")
        .update({ color: parsed.data.color })
        .in("id", matchingIds)
      if (error) return { ok: false, error: error.message }
    }
    revalidatePath(`/diary/${input.date}`)
  }
  revalidatePath("/diary/settings/activities")
  revalidatePath("/diary", "layout")
  return { ok: true }
}
