"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  AddTransactionSchema,
  UpdateTransactionSchema,
  DeleteTransactionSchema,
  ToggleIsPaidSchema,
  type AddTransactionInput,
  type UpdateTransactionInput,
  type DeleteTransactionInput,
  type ToggleIsPaidInput,
} from "@/lib/validators/transactions"

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

export async function addTransaction(
  input: AddTransactionInput
): Promise<Result> {
  const parsed = AddTransactionSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if (!ctx.ok) return { ok: false, error: ctx.error }
  const { supabase, user } = ctx

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      year_month: parsed.data.year_month,
      date: parsed.data.date,
      type: parsed.data.type,
      category_1st: parsed.data.category_1st,
      category_2nd: parsed.data.category_2nd ?? null,
      payment_method: parsed.data.payment_method ?? null,
      description: parsed.data.description ?? null,
      amount: parsed.data.amount,
      is_paid: parsed.data.is_paid ?? false,
      is_fixed: false, // 사용자 추가는 항상 false
    })
    .select("id")
    .single()

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/budget/${parsed.data.year_month}`, "page")
  return { ok: true, id: data?.id }
}

export async function updateTransaction(
  input: UpdateTransactionInput
): Promise<Result> {
  const parsed = UpdateTransactionSchema.safeParse(input)
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

  const { data, error } = await supabase
    .from("transactions")
    .update(patch)
    .eq("id", id)
    .select("year_month")
    .single()

  if (error) return { ok: false, error: error.message }
  if (data?.year_month) {
    revalidatePath(`/budget/${data.year_month}`, "page")
  }
  return { ok: true }
}

export async function deleteTransaction(
  input: DeleteTransactionInput
): Promise<Result> {
  const parsed = DeleteTransactionSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if (!ctx.ok) return { ok: false, error: ctx.error }
  const { supabase } = ctx

  // ym 알아내기 위해 select 후 delete
  const { data: existing } = await supabase
    .from("transactions")
    .select("year_month")
    .eq("id", parsed.data.id)
    .maybeSingle()

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", parsed.data.id)

  if (error) return { ok: false, error: error.message }
  if (existing?.year_month) {
    revalidatePath(`/budget/${existing.year_month}`, "page")
  }
  return { ok: true }
}

export async function toggleIsPaid(input: ToggleIsPaidInput): Promise<Result> {
  const parsed = ToggleIsPaidSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if (!ctx.ok) return { ok: false, error: ctx.error }
  const { supabase } = ctx

  const { data, error } = await supabase
    .from("transactions")
    .update({ is_paid: parsed.data.is_paid })
    .eq("id", parsed.data.id)
    .select("year_month")
    .single()

  if (error) return { ok: false, error: error.message }
  if (data?.year_month) {
    revalidatePath(`/budget/${data.year_month}`, "page")
  }
  return { ok: true }
}
