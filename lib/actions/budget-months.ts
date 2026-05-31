"use server"

import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { getPrevYm, ymWithDay } from "@/lib/utils/ym"

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

const CreateNextMonthSchema = z.object({
  ym: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "ym 형식 오류"),
})

export async function createNextMonth(input: { ym: string }): Promise<Result> {
  const parsed = CreateNextMonthSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if (!ctx.ok) return { ok: false, error: ctx.error }
  const { supabase, user } = ctx

  // idempotent — 이미 존재하면 성공으로 간주
  const { data: existing } = await supabase
    .from("monthly_summaries")
    .select("year_month")
    .eq("year_month", parsed.data.ym)
    .maybeSingle()

  if (existing) {
    revalidatePath("/budget", "layout")
    return { ok: true }
  }

  // 1. 직전 월 잔고 + monthly_summaries INSERT
  const prevYm = getPrevYm(parsed.data.ym)
  const { data: prev } = await supabase
    .from("monthly_summaries")
    .select("current_balance")
    .eq("year_month", prevYm)
    .maybeSingle()
  const opening = prev?.current_balance ?? 0

  const { error: sumErr } = await supabase.from("monthly_summaries").insert({
    user_id: user.id,
    year_month: parsed.data.ym,
    opening_balance: opening,
    current_balance: opening,
    expected_balance: opening,
    // income_total, expense_total, paid_total, unpaid_total은 DB default 0
  })
  if (sumErr) return { ok: false, error: sumErr.message }

  // 2. active 고정지출 bulk INSERT (Phase 3 트리거가 monthly_summaries 자동 재계산)
  const { data: fixed, error: fxErr } = await supabase
    .from("fixed_expenses")
    .select(
      "day_of_month, type, category_1st, category_2nd, payment_method, description, amount"
    )
    .eq("active", true)

  if (fxErr) return { ok: false, error: fxErr.message }

  if (fixed && fixed.length > 0) {
    const rows = fixed.map((f) => ({
      user_id: user.id,
      year_month: parsed.data.ym,
      date: ymWithDay(parsed.data.ym, f.day_of_month),
      type: f.type,
      category_1st: f.category_1st,
      category_2nd: f.category_2nd,
      payment_method: f.payment_method,
      description: f.description,
      amount: f.amount,
      is_paid: false,
      is_fixed: true,
    }))

    const { error: txErr } = await supabase.from("transactions").insert(rows)
    if (txErr) return { ok: false, error: txErr.message }
    // ↑ Phase 3 trg_transactions_recalc fire → monthly_summaries 자동 재계산
    //   (방금 INSERT한 행 + 이후 모든 월 cascade)
  }

  revalidatePath("/budget", "layout")
  return { ok: true }
}
