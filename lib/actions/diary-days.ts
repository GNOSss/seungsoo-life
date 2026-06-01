"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  UpsertRawInputSchema,
  DeleteDiaryDateSchema,
  type UpsertRawInputInput,
  type DeleteDiaryDateInput,
} from "@/lib/validators/diary"
import { parseAllLines, type DiaryEntryDraft } from "@/lib/utils/diary-parse"
import { getPrevDate } from "@/lib/utils/diary-date"
import {
  findColorByKeywords,
  DEFAULT_COLOR,
} from "@/lib/utils/diary-color-match"

type Result =
  | { ok: true; failed: { line: string; error: string }[] }
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

/**
 * 그 날의 raw_input 저장 + entries 전체 replace.
 * 자정 넘김 entries는 어제 날짜로도 INSERT.
 * 활동명별 색은 라이브러리에서 조회, 없으면 #D8D8D8.
 */
export async function upsertRawInput(
  input: UpsertRawInputInput
): Promise<Result> {
  const parsed = UpsertRawInputSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if (!ctx.ok) return { ok: false, error: ctx.error }
  const { supabase, user } = ctx
  const { date, raw_input } = parsed.data

  // 1. 전날 마지막 entry end_time 조회 (자정 추론용)
  const prevDate = getPrevDate(date)
  const { data: lastPrev } = await supabase
    .from("diary_entries")
    .select("end_time")
    .eq("user_id", user.id)
    .eq("date", prevDate)
    .order("end_time", { ascending: false })
    .limit(1)
    .maybeSingle()

  // 2. 파싱
  const { drafts, failed } = parseAllLines(
    raw_input,
    date,
    lastPrev?.end_time ?? null
  )

  // 3. 활동명 → 색 (라이브러리 키워드 매칭)
  //    name 필드는 콤마 구분 키워드 리스트로 취급. 활동명이 키워드 중 하나라도
  //    포함하면 매칭. sort_order 오름차순 첫 매칭 우선.
  const { data: libs } = await supabase
    .from("diary_activities")
    .select("name, color")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true })
  const libRows = libs ?? []
  const colorByName = new Map<string, string>()
  const uniqueNames = Array.from(new Set(drafts.map((d) => d.activity_name)))
  for (const name of uniqueNames) {
    colorByName.set(name, findColorByKeywords(name, libRows))
  }

  // 4. diary_days upsert (raw_input 보존)
  const { error: dayErr } = await supabase.from("diary_days").upsert(
    {
      user_id: user.id,
      date,
      raw_input,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,date" }
  )
  if (dayErr) return { ok: false, error: dayErr.message }

  // 5. 영향받는 날짜의 entries 삭제 (오늘 + 자정 넘김 시 어제도)
  const affectedDates = Array.from(new Set(drafts.map((d) => d.date)))
  if (affectedDates.length > 0) {
    const { error: delErr } = await supabase
      .from("diary_entries")
      .delete()
      .eq("user_id", user.id)
      .in("date", affectedDates)
    if (delErr) return { ok: false, error: delErr.message }
  } else {
    const { error: delErr } = await supabase
      .from("diary_entries")
      .delete()
      .eq("user_id", user.id)
      .eq("date", date)
    if (delErr) return { ok: false, error: delErr.message }
  }

  // 6. 새 entries INSERT
  if (drafts.length > 0) {
    const rows = drafts.map((d: DiaryEntryDraft) => ({
      user_id: user.id,
      date: d.date,
      start_time: d.start_time,
      end_time: d.end_time,
      activity_name: d.activity_name,
      color: colorByName.get(d.activity_name) ?? DEFAULT_COLOR,
      raw_input: d.raw_input,
    }))
    const { error: insErr } = await supabase.from("diary_entries").insert(rows)
    if (insErr) return { ok: false, error: insErr.message }
  }

  revalidatePath(`/diary/${date}`)
  for (const aff of affectedDates) {
    if (aff !== date) revalidatePath(`/diary/${aff}`)
  }
  revalidatePath("/diary", "layout")
  return { ok: true, failed }
}

/**
 * 그 날짜의 모든 데이터 삭제 (entries + quest_checks + days).
 * 가계부 ADR-024 패턴.
 */
export async function deleteDiaryDate(
  input: DeleteDiaryDateInput
): Promise<Result> {
  const parsed = DeleteDiaryDateSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const ctx = await getAuthedClient()
  if (!ctx.ok) return { ok: false, error: ctx.error }
  const { supabase, user } = ctx
  const { date } = parsed.data

  const { error: e1 } = await supabase
    .from("diary_entries")
    .delete()
    .eq("user_id", user.id)
    .eq("date", date)
  if (e1) return { ok: false, error: e1.message }

  const { error: e2 } = await supabase
    .from("diary_quest_checks")
    .delete()
    .eq("user_id", user.id)
    .eq("date", date)
  if (e2) return { ok: false, error: e2.message }

  const { error: e3 } = await supabase
    .from("diary_days")
    .delete()
    .eq("user_id", user.id)
    .eq("date", date)
  if (e3) return { ok: false, error: e3.message }

  revalidatePath("/diary", "layout")
  return { ok: true, failed: [] }
}
