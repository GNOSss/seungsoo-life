"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  AddTodoItemSchema,
  UpdateTodoItemSchema,
  DeleteTodoItemSchema,
  type AddTodoItemInput,
  type UpdateTodoItemInput,
  type DeleteTodoItemInput,
} from "@/lib/validators/diary-todo-items"

type Result = { ok: true; id?: string } | { ok: false; error: string }

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

export async function addTodoItem(input: AddTodoItemInput): Promise<Result> {
  const parsed = AddTodoItemSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if (!ctx.ok) return { ok: false, error: ctx.error }
  const { supabase, user } = ctx

  const { data, error } = await supabase
    .from("diary_todo_items")
    .insert({
      user_id: user.id,
      kind: parsed.data.kind,
      importance: parsed.data.importance,
      item_date: parsed.data.item_date ?? null,
      item_time: parsed.data.item_time ?? null,
      target: parsed.data.target ?? null,
      title: parsed.data.title,
      detail: parsed.data.detail ?? null,
      sort_order: parsed.data.sort_order ?? Date.now(),
    })
    .select("id")
    .single()

  if (error) return { ok: false, error: error.message }
  revalidatePath("/diary/notes")
  return { ok: true, id: data.id }
}

export async function updateTodoItem(input: UpdateTodoItemInput): Promise<Result> {
  const parsed = UpdateTodoItemSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if (!ctx.ok) return { ok: false, error: ctx.error }
  const { supabase, user } = ctx

  const { id, ...rest } = parsed.data
  const { error } = await supabase
    .from("diary_todo_items")
    .update({ ...rest, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath("/diary/notes")
  return { ok: true }
}

export async function deleteTodoItem(input: DeleteTodoItemInput): Promise<Result> {
  const parsed = DeleteTodoItemSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if (!ctx.ok) return { ok: false, error: ctx.error }
  const { supabase, user } = ctx

  const { error } = await supabase
    .from("diary_todo_items")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath("/diary/notes")
  return { ok: true }
}
