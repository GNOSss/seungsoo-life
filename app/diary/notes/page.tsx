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

  const TODO_PLACEHOLDER = `## 이번 주
- [ ] 보고서 작성 — 참고: [회사 위키](https://wiki.example.com/report)
- [x] 운동 1시간

## 다음 주
- [ ] 거실 정리
- [ ] 청약 통장 확인 ([홈텍스](https://www.hometax.go.kr))`

  const WISH_PLACEHOLDER = `## 여행
- 제주도 (가족) — [숙소 검색](https://www.airbnb.co.kr)
- 후쿠오카

## 사고 싶은 것
- 새 키보드 — [HHKB](https://happyhackingkb.com)
- 모니터 암

## 배우고 싶은 것
- 중국어 회화 — [듀오링고](https://www.duolingo.com)`

  return (
    <div className="space-y-4 p-3 md:space-y-6 md:p-6">
      <h1 className="text-xl font-bold md:text-2xl">📝 할 것 / 하고 싶은 것</h1>
      <p className="text-xs text-neutral-500">
        마크다운 지원 — <code>##</code> 제목, <code>- [ ]</code> 체크박스,{" "}
        <code>-</code> 리스트, <code>**굵게**</code>, <code>*기울임*</code>,{" "}
        <code>[텍스트](https://...)</code> 링크, 표 등.
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
