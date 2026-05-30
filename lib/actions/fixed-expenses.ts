"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  AddFixedExpenseSchema,
  UpdateFixedExpenseSchema,
  DeleteFixedExpenseSchema,
  type AddFixedExpenseInput,
  type UpdateFixedExpenseInput,
  type DeleteFixedExpenseInput,
} from "@/lib/validators/fixed-expenses"

type Result =
  | { ok: true; id?: string }
  | { ok: false; error: string }

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

export async function addFixedExpense(
  input: AddFixedExpenseInput
): Promise<Result> {
  const parsed = AddFixedExpenseSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if (!ctx.ok) return { ok: false, error: ctx.error }
  const { supabase, user } = ctx

  const { data, error } = await supabase
    .from("fixed_expenses")
    .insert({
      day_of_month: parsed.data.day_of_month,
      type: parsed.data.type,
      category_1st: parsed.data.category_1st,
      category_2nd: parsed.data.category_2nd ?? null,
      payment_method: parsed.data.payment_method ?? null,
      description: parsed.data.description ?? null,
      amount: parsed.data.amount,
      active: true,
      user_id: user.id,
    })
    .select("id")
    .single()

  if (error) return { ok: false, error: error.message }
  revalidatePath("/budget/settings/fixed-expenses")
  return { ok: true, id: data?.id }
}

export async function updateFixedExpense(
  input: UpdateFixedExpenseInput
): Promise<Result> {
  const parsed = UpdateFixedExpenseSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if (!ctx.ok) return { ok: false, error: ctx.error }
  const { supabase } = ctx

  const { id, ...rest } = parsed.data
  const patch: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(rest)) {
    if (v !== undefined) patch[k] = v
  }

  if (Object.keys(patch).length === 0) return { ok: true }

  const { error } = await supabase
    .from("fixed_expenses")
    .update(patch)
    .eq("id", id)

  if (error) return { ok: false, error: error.message }
  revalidatePath("/budget/settings/fixed-expenses")
  return { ok: true }
}

export async function deleteFixedExpense(
  input: DeleteFixedExpenseInput
): Promise<Result> {
  const parsed = DeleteFixedExpenseSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if (!ctx.ok) return { ok: false, error: ctx.error }
  const { supabase } = ctx

  const { error } = await supabase
    .from("fixed_expenses")
    .delete()
    .eq("id", parsed.data.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath("/budget/settings/fixed-expenses")
  return { ok: true }
}
