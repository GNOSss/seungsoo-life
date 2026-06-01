"use client"

import { useState, useTransition } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { upsertDiaryNote, type DiaryNoteKind } from "@/lib/actions/diary-notes"
import { toast } from "sonner"

export function NoteCard({
  kind,
  title,
  emoji,
  initialContent,
  placeholder,
}: {
  kind: DiaryNoteKind
  title: string
  emoji: string
  initialContent: string
  placeholder: string
}) {
  const [editing, setEditing] = useState(initialContent.trim() === "")
  const [draft, setDraft] = useState(initialContent)
  const [saved, setSaved] = useState(initialContent)
  const [pending, startTransition] = useTransition()

  const onSave = () => {
    startTransition(async () => {
      const result = await upsertDiaryNote({ kind, content: draft })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setSaved(draft)
      setEditing(false)
      toast.success("저장됨")
    })
  }

  const onCancel = () => {
    setDraft(saved)
    setEditing(false)
  }

  return (
    <div className="flex flex-col rounded border border-neutral-200 bg-white">
      <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2">
        <h2 className="text-sm font-semibold">
          {emoji} {title}
        </h2>
        {editing ? (
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={pending}
            >
              취소
            </Button>
            <Button size="sm" onClick={onSave} disabled={pending}>
              {pending ? "저장 중..." : "저장"}
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
            disabled={pending}
          >
            ✏️ 편집
          </Button>
        )}
      </div>
      <div className="flex-1 p-3">
        {editing ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={pending}
            rows={18}
            placeholder={placeholder}
            className="block w-full resize-y rounded border border-neutral-300 px-3 py-2 font-mono text-sm leading-relaxed"
          />
        ) : saved.trim() === "" ? (
          <p className="text-sm text-neutral-400">
            아직 비어있습니다. 편집을 눌러 작성하세요.
          </p>
        ) : (
          <div
            className={cn(
              "prose prose-sm max-w-none",
              "prose-headings:font-semibold prose-headings:text-neutral-900",
              "prose-p:my-2 prose-p:leading-relaxed",
              "prose-ul:my-2 prose-li:my-0.5",
              "prose-code:rounded prose-code:bg-neutral-100 prose-code:px-1 prose-code:py-0.5",
              "prose-a:text-blue-600"
            )}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{saved}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}
