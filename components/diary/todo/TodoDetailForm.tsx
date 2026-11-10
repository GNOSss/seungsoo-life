"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { ImportanceBadge } from "./ImportanceBadge"
import type { TodoItemRow } from "./sortTodoItems"
import { getKoreanWeekday, formatHm } from "@/lib/utils/diary-todo-date"
import { updateTodoItem, deleteTodoItem } from "@/lib/actions/diary-todo-items"
import type { TodoItemImportance } from "@/lib/validators/diary-todo-items"
import { toast } from "sonner"

type Draft = {
  importance: TodoItemImportance
  item_date: string
  item_time: string
  target: string
  title: string
  detail: string
}

function toDraft(item: TodoItemRow): Draft {
  return {
    importance: item.importance,
    item_date: item.item_date ?? "",
    item_time: item.item_time ? formatHm(item.item_time) : "",
    target: item.target ?? "",
    title: item.title,
    detail: item.detail ?? "",
  }
}

export function TodoDetailForm({ item }: { item: TodoItemRow }) {
  const router = useRouter()
  const [draft, setDraft] = useState<Draft>(toDraft(item))
  const [askDelete, setAskDelete] = useState(false)
  const [previewDetail, setPreviewDetail] = useState(false)
  const [pending, startTransition] = useTransition()

  const backHref = `/diary/notes`

  const save = () => {
    const title = draft.title.trim()
    if (!title) {
      toast.error("항목은 필수")
      return
    }
    startTransition(async () => {
      const result = await updateTodoItem({
        id: item.id,
        importance: draft.importance,
        item_date: draft.item_date || null,
        item_time: draft.item_time || null,
        target: draft.target || null,
        title,
        detail: draft.detail || null,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("저장됨")
      router.push(backHref)
    })
  }

  const confirmDelete = () => {
    startTransition(async () => {
      const result = await deleteTodoItem({ id: item.id })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("삭제됨")
      router.push(backHref)
    })
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">항목 상세</h1>

      <div>
        <label className="mb-1 block text-xs text-neutral-500">중요도</label>
        <ImportanceBadge
          importance={draft.importance}
          onCycle={(next) => setDraft({ ...draft, importance: next })}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="min-w-0 overflow-hidden">
          <label className="mb-1 block text-xs text-neutral-500">날짜</label>
          <input
            type="date"
            value={draft.item_date}
            onChange={(e) => setDraft({ ...draft, item_date: e.target.value })}
            className="mx-auto box-border block h-11 w-[90%] min-w-0 rounded border border-neutral-300 px-1 text-xs leading-[2.75rem]"
          />
        </div>
        <div className="min-w-0 overflow-hidden">
          <label className="mb-1 block text-xs text-neutral-500">요일</label>
          <div className="mx-auto box-border flex h-11 w-[90%] items-center justify-center rounded border border-neutral-300 bg-neutral-50 text-xs text-neutral-500">
            {draft.item_date ? getKoreanWeekday(draft.item_date) : "—"}
          </div>
        </div>
        <div className="min-w-0 overflow-hidden">
          <label className="mb-1 block text-xs text-neutral-500">시간</label>
          <input
            type="time"
            value={draft.item_time}
            onChange={(e) => setDraft({ ...draft, item_time: e.target.value })}
            className="mx-auto box-border block h-11 w-[90%] min-w-0 rounded border border-neutral-300 px-1 text-xs leading-[2.75rem]"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-neutral-500">대상</label>
        <input
          type="text"
          value={draft.target}
          onChange={(e) => setDraft({ ...draft, target: e.target.value })}
          placeholder="예: 승수, 재나"
          className="h-11 w-full rounded border border-neutral-300 px-3 text-base"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-neutral-500">항목</label>
        <input
          type="text"
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          className="h-11 w-full rounded border border-neutral-300 px-3 text-base font-bold"
        />
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-xs text-neutral-500">상세</label>
          <button
            type="button"
            onClick={() => setPreviewDetail((v) => !v)}
            className="text-xs text-neutral-400 underline"
          >
            {previewDetail ? "편집" : "미리보기"}
          </button>
        </div>
        {previewDetail ? (
          <div className="prose prose-sm max-w-none rounded border border-neutral-200 bg-neutral-50 p-3">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {draft.detail || "_내용 없음_"}
            </ReactMarkdown>
          </div>
        ) : (
          <textarea
            value={draft.detail}
            onChange={(e) => setDraft({ ...draft, detail: e.target.value })}
            rows={12}
            className="block w-full resize-y rounded border border-neutral-300 px-3 py-2 font-mono text-base leading-relaxed"
          />
        )}
      </div>

      <div className="flex gap-2 pb-6">
        {askDelete ? (
          <>
            <Button
              variant="outline"
              onClick={() => setAskDelete(false)}
              disabled={pending}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={pending}
              className="flex-1"
            >
              {pending ? "삭제 중..." : "정말 삭제"}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              onClick={() => router.push(backHref)}
              disabled={pending}
              className="flex-1"
            >
              닫기
            </Button>
            <Button
              variant="destructive"
              onClick={() => setAskDelete(true)}
              disabled={pending}
            >
              삭제
            </Button>
            <Button onClick={save} disabled={pending} className="flex-1">
              {pending ? "..." : "저장"}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
