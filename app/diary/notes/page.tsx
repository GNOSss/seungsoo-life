import { createClient } from "@/lib/supabase/server"
import { NoteCard } from "@/components/diary/notes/NoteCard"
import type { DiaryNoteKind } from "@/lib/actions/diary-notes"

export default async function DiaryNotesPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("diary_notes")
    .select("kind, content")

  if (error)
    return <p className="p-8 text-sm text-red-600">에러: {error.message}</p>

  const byKind: Record<DiaryNoteKind, string> = { todo: "", wish: "" }
  for (const r of data ?? []) {
    byKind[r.kind as DiaryNoteKind] = r.content
  }

  const TODO_PLACEHOLDER = `## 이번 주\n- [ ] 보고서 작성\n- [x] 운동 1시간\n\n## 다음 주\n- [ ] 거실 정리`
  const WISH_PLACEHOLDER = `## 여행\n- 제주도 (가족)\n- 후쿠오카\n\n## 사고 싶은 것\n- 새 키보드\n- 모니터 암\n\n## 배우고 싶은 것\n- 중국어 회화`

  return (
    <div className="space-y-4 p-3 md:space-y-6 md:p-6">
      <h1 className="text-xl font-bold md:text-2xl">📝 할 것 / 하고 싶은 것</h1>
      <p className="text-xs text-neutral-500">
        마크다운 지원 — `##` 제목, `- [ ]` 체크박스, `- ` 리스트, `**굵게**`, `*기울임*`, 표 등.
      </p>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <NoteCard
          kind="todo"
          emoji="📋"
          title="할 것"
          initialContent={byKind.todo}
          placeholder={TODO_PLACEHOLDER}
        />
        <NoteCard
          kind="wish"
          emoji="⭐"
          title="하고 싶은 것"
          initialContent={byKind.wish}
          placeholder={WISH_PLACEHOLDER}
        />
      </div>
    </div>
  )
}
