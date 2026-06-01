"use server"

import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

type Result = { ok: true } | { ok: false; error: string }

const KindSchema = z.enum(["todo", "wish"])
const UpsertSchema = z.object({
  kind: KindSchema,
  content: z.string().max(50000),
})

export type DiaryNoteKind = z.infer<typeof KindSchema>

export async function upsertDiaryNote(input: {
  kind: DiaryNoteKind
  content: string
}): Promise<Result> {
  const parsed = UpsertSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "로그인 필요" }

  const { error } = await supabase.from("diary_notes").upsert(
    {
      user_id: user.id,
      kind: parsed.data.kind,
      content: parsed.data.content,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,kind" }
  )
  if (error) return { ok: false, error: error.message }
  revalidatePath("/diary/notes")
  return { ok: true }
}
