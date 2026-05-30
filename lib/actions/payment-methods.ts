"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  AddPaymentMethodSchema,
  UpdatePaymentMethodSchema,
  DeletePaymentMethodSchema,
  MovePaymentMethodSchema,
  type AddPaymentMethodInput,
  type UpdatePaymentMethodInput,
  type DeletePaymentMethodInput,
  type MovePaymentMethodInput,
} from "@/lib/validators/payment-methods"

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

export async function addPaymentMethod(
  input: AddPaymentMethodInput
): Promise<Result> {
  const parsed = AddPaymentMethodSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if (!ctx.ok) return { ok: false, error: ctx.error }
  const { supabase, user } = ctx

  const { data: maxRow } = await supabase
    .from("payment_methods")
    .select("sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextSort = (maxRow?.sort_order ?? 0) + 1

  const { error } = await supabase.from("payment_methods").insert({
    name: parsed.data.name,
    sort_order: nextSort,
    active: true,
    user_id: user.id,
  })

  if (error) return { ok: false, error: error.message }
  revalidatePath("/budget/settings/payment-methods")
  return { ok: true }
}

export async function updatePaymentMethod(
  input: UpdatePaymentMethodInput
): Promise<Result> {
  const parsed = UpdatePaymentMethodSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if (!ctx.ok) return { ok: false, error: ctx.error }
  const { supabase } = ctx

  const patch: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) patch.name = parsed.data.name
  if (parsed.data.active !== undefined) patch.active = parsed.data.active

  const { error } = await supabase
    .from("payment_methods")
    .update(patch)
    .eq("id", parsed.data.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath("/budget/settings/payment-methods")
  return { ok: true }
}

export async function deletePaymentMethod(
  input: DeletePaymentMethodInput
): Promise<Result> {
  const parsed = DeletePaymentMethodSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if (!ctx.ok) return { ok: false, error: ctx.error }
  const { supabase } = ctx

  const { error } = await supabase
    .from("payment_methods")
    .delete()
    .eq("id", parsed.data.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath("/budget/settings/payment-methods")
  return { ok: true }
}

export async function movePaymentMethod(
  input: MovePaymentMethodInput
): Promise<Result> {
  const parsed = MovePaymentMethodSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if (!ctx.ok) return { ok: false, error: ctx.error }
  const { supabase, user } = ctx

  const { data: rows, error: fetchError } = await supabase
    .from("payment_methods")
    .select("id, sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true })

  if (fetchError) return { ok: false, error: fetchError.message }

  const idx = rows?.findIndex((r) => r.id === parsed.data.id) ?? -1
  if (idx === -1) return { ok: false, error: "결제수단을 찾을 수 없음" }

  const targetIdx = parsed.data.direction === "up" ? idx - 1 : idx + 1
  if (targetIdx < 0 || targetIdx >= (rows?.length ?? 0))
    return { ok: false, error: "더 이동할 수 없음" }

  const a = rows![idx]
  const b = rows![targetIdx]

  const { error: e1 } = await supabase
    .from("payment_methods")
    .update({ sort_order: b.sort_order })
    .eq("id", a.id)
  if (e1) return { ok: false, error: e1.message }

  const { error: e2 } = await supabase
    .from("payment_methods")
    .update({ sort_order: a.sort_order })
    .eq("id", b.id)
  if (e2) return { ok: false, error: e2.message }

  revalidatePath("/budget/settings/payment-methods")
  return { ok: true }
}
