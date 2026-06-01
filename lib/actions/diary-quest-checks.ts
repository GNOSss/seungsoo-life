"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  ToggleQuestCheckSchema,
  type ToggleQuestCheckInput,
} from "@/lib/validators/diary"

type Result = { ok: true } | { ok: false; error: string }

export async function toggleQuestCheck(
  input: ToggleQuestCheckInput
): Promise<Result> {
  const parsed = ToggleQuestCheckSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "로그인 필요" }

  const { error } = await supabase.from("diary_quest_checks").upsert(
    {
      user_id: user.id,
      date: parsed.data.date,
      quest_id: parsed.data.quest_id,
      checked: parsed.data.checked,
    },
    { onConflict: "user_id,date,quest_id" }
  )
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/diary/${parsed.data.date}`)
  return { ok: true }
}
