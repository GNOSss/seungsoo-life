"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  AddCategorySchema,
  UpdateCategorySchema,
  DeleteCategorySchema,
  ReorderCategoriesSchema,
  type AddCategoryInput,
  type UpdateCategoryInput,
  type DeleteCategoryInput,
  type ReorderCategoriesInput,
} from "@/lib/validators/categories"

type Result = { ok: true } | { ok: false; error: string }

type AuthedClient =
  | { ok: false; error: string }
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; user: NonNullable<Awaited<ReturnType<Awaited<ReturnType<typeof createClient>>["auth"]["getUser"]>>["data"]["user"]> }

async function getAuthedClient(): Promise<AuthedClient> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "로그인 필요" }
  return { ok: true, supabase, user }
}

export async function addCategory(input: AddCategoryInput): Promise<Result> {
  const parsed = AddCategorySchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if (!ctx.ok) return { ok: false, error: ctx.error }
  const { supabase, user } = ctx

  const { data: maxRow } = await supabase
    .from("categories")
    .select("sort_order")
    .eq("user_id", user.id)
    .eq("type", parsed.data.type)
    .is("parent_id", parsed.data.parent_id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextSort = (maxRow?.sort_order ?? 0) + 1

  const { error } = await supabase.from("categories").insert({
    name: parsed.data.name,
    type: parsed.data.type,
    parent_id: parsed.data.parent_id,
    sort_order: nextSort,
    user_id: user.id,
  })

  if (error) return { ok: false, error: error.message }
  revalidatePath("/budget/settings/categories")
  return { ok: true }
}

export async function updateCategory(
  input: UpdateCategoryInput
): Promise<Result> {
  const parsed = UpdateCategorySchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if (!ctx.ok) return { ok: false, error: ctx.error }
  const { supabase } = ctx

  const { error } = await supabase
    .from("categories")
    .update({ name: parsed.data.name })
    .eq("id", parsed.data.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath("/budget/settings/categories")
  return { ok: true }
}

export async function deleteCategory(
  input: DeleteCategoryInput
): Promise<Result> {
  const parsed = DeleteCategorySchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if (!ctx.ok) return { ok: false, error: ctx.error }
  const { supabase } = ctx

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", parsed.data.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath("/budget/settings/categories")
  return { ok: true }
}

export async function reorderCategories(
  input: ReorderCategoriesInput
): Promise<Result> {
  const parsed = ReorderCategoriesSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if (!ctx.ok) return { ok: false, error: ctx.error }
  const { supabase, user } = ctx

  for (let i = 0; i < parsed.data.ids.length; i++) {
    const { error } = await supabase
      .from("categories")
      .update({ sort_order: i + 1 })
      .eq("id", parsed.data.ids[i])
      .eq("user_id", user.id)
    if (error) return { ok: false, error: error.message }
  }

  revalidatePath("/budget/settings/categories")
  return { ok: true }
}
