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

const DeleteMonthSchema = z.object({
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
    // day_of_month=0은 "날짜 미정" 플레이스홀더 — 그래도 거래는 INSERT (사용자가 나중에 날짜 수정).
    // 1일을 기본값으로 사용 (PostgreSQL date 'YYYY-MM-00'은 invalid이므로).
    const rows = fixed.map((f) => ({
      user_id: user.id,
      year_month: parsed.data.ym,
      date: ymWithDay(parsed.data.ym, Math.max(f.day_of_month, 1)),
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

export async function deleteMonth(input: { ym: string }): Promise<Result> {
  const parsed = DeleteMonthSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if (!ctx.ok) return { ok: false, error: ctx.error }
  const { supabase } = ctx

  // 1. 해당 월의 모든 거래 삭제
  //    Phase 3 trg_transactions_recalc가 각 삭제마다 fire → 이후 월 잔고 cascade 자동 갱신
  const { error: txErr } = await supabase
    .from("transactions")
    .delete()
    .eq("year_month", parsed.data.ym)
  if (txErr) return { ok: false, error: txErr.message }

  // 2. 빈 monthly_summaries row 삭제
  //    이 시점엔 cascade가 이미 끝났으므로 row만 안전하게 제거
  const { error: sumErr } = await supabase
    .from("monthly_summaries")
    .delete()
    .eq("year_month", parsed.data.ym)
  if (sumErr) return { ok: false, error: sumErr.message }

  revalidatePath("/budget", "layout")
  return { ok: true }
}
