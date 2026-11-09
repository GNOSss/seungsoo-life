"use client"

import { useState, useTransition, useEffect } from "react"
import { Drawer } from "vaul"
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

export function TodoDetailModal({
  item,
  open,
  onOpenChange,
}: {
  item: TodoItemRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [draft, setDraft] = useState<Draft | null>(item ? toDraft(item) : null)
  const [askDelete, setAskDelete] = useState(false)
  const [previewDetail, setPreviewDetail] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (open && item) setDraft(toDraft(item))
    if (!open) {
      setAskDelete(false)
      setPreviewDetail(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id])

  if (!item || !draft) return null

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
      onOpenChange(false)
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
      onOpenChange(false)
    })
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} dismissible={!pending}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mx-auto flex max-h-[85vh] max-w-md flex-col rounded-t-xl border-t border-neutral-200 bg-white">
          <div className="mx-auto mt-2 h-1 w-12 shrink-0 rounded-full bg-neutral-300" />
          <Drawer.Title className="px-4 pt-3 text-base font-semibold">
            항목 상세
          </Drawer.Title>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3" data-vaul-no-drag>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">중요도</label>
              <ImportanceBadge
                importance={draft.importance}
                onCycle={(next) => setDraft({ ...draft, importance: next })}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="min-w-0">
                <label className="mb-1 block text-xs text-neutral-500">날짜</label>
                <input
                  type="date"
                  value={draft.item_date}
                  onChange={(e) => setDraft({ ...draft, item_date: e.target.value })}
                  className="h-11 w-full min-w-0 rounded border border-neutral-300 px-1 text-xs"
                />
              </div>
              <div className="min-w-0">
                <label className="mb-1 block text-xs text-neutral-500">요일</label>
                <div className="flex h-11 w-full items-center justify-center rounded border border-neutral-200 bg-neutral-50 text-sm text-neutral-500">
                  {draft.item_date ? getKoreanWeekday(draft.item_date) : "—"}
                </div>
              </div>
              <div className="min-w-0">
                <label className="mb-1 block text-xs text-neutral-500">시간</label>
                <input
                  type="time"
                  value={draft.item_time}
                  onChange={(e) => setDraft({ ...draft, item_time: e.target.value })}
                  className="h-11 w-full min-w-0 rounded border border-neutral-300 px-1 text-xs"
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
                  rows={8}
                  className="block w-full resize-y rounded border border-neutral-300 px-3 py-2 font-mono text-base leading-relaxed"
                />
              )}
            </div>
          </div>

          <div
            className="flex shrink-0 gap-2 border-t border-neutral-100 px-4 py-3"
            data-vaul-no-drag
          >
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
                  onClick={() => onOpenChange(false)}
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
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
