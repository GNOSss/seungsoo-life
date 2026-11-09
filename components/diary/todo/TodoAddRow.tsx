"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { ImportanceBadge } from "./ImportanceBadge"
import { addTodoItem } from "@/lib/actions/diary-todo-items"
import type { TodoItemImportance, TodoItemKind } from "@/lib/validators/diary-todo-items"
import { getKoreanWeekday } from "@/lib/utils/diary-todo-date"
import { toast } from "sonner"

type Draft = {
  importance: TodoItemImportance
  item_date: string
  item_time: string
  target: string
  title: string
}

const EMPTY_DRAFT: Draft = {
  importance: "mid",
  item_date: "",
  item_time: "",
  target: "",
  title: "",
}

export function TodoAddRow({ kind }: { kind: TodoItemKind }) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [pending, startTransition] = useTransition()

  const save = () => {
    const title = draft.title.trim()
    if (!title) return
    startTransition(async () => {
      const result = await addTodoItem({
        kind,
        importance: draft.importance,
        item_date: draft.item_date || null,
        item_time: draft.item_time || null,
        target: draft.target || null,
        title,
        sort_order: Date.now(),
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setDraft({ ...EMPTY_DRAFT, importance: draft.importance })
    })
  }

  if (!adding) {
    return (
      <div className="px-2 py-2">
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          + 새 항목
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2 border-t border-neutral-100 px-2 py-2">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-[56px_1fr_36px_1fr_1fr_2fr]">
        <div>
          <label className="mb-1 block text-[10px] text-neutral-400 md:hidden">중요도</label>
          <ImportanceBadge
            importance={draft.importance}
            onCycle={(next) => setDraft({ ...draft, importance: next })}
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-neutral-400 md:hidden">날짜</label>
          <input
            type="date"
            value={draft.item_date}
            onChange={(e) => setDraft({ ...draft, item_date: e.target.value })}
            disabled={pending}
            className="w-full rounded border border-neutral-300 px-1 py-1 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-neutral-400 md:hidden">요일</label>
          <div className="flex h-full min-h-[30px] items-center rounded border border-neutral-200 bg-neutral-50 px-2 text-sm text-neutral-500">
            {draft.item_date ? getKoreanWeekday(draft.item_date) : "—"}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-neutral-400 md:hidden">시간</label>
          <input
            type="time"
            value={draft.item_time}
            onChange={(e) => setDraft({ ...draft, item_time: e.target.value })}
            disabled={pending}
            className="w-full rounded border border-neutral-300 px-1 py-1 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-neutral-400 md:hidden">대상</label>
          <input
            type="text"
            value={draft.target}
            onChange={(e) => setDraft({ ...draft, target: e.target.value })}
            disabled={pending}
            placeholder="승수, 재나"
            className="w-full rounded border border-neutral-300 px-2 py-1 text-sm"
          />
        </div>
        <div className="col-span-2 md:col-span-1">
          <label className="mb-1 block text-[10px] text-neutral-400 md:hidden">항목</label>
          <input
            autoFocus
            type="text"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") save()
            }}
            disabled={pending}
            placeholder="항목 입력"
            className="w-full rounded border border-neutral-300 px-2 py-1 text-sm font-bold"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={save}
          disabled={pending || draft.title.trim().length === 0}
        >
          추가
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setDraft(EMPTY_DRAFT)
            setAdding(false)
          }}
          disabled={pending}
        >
          완료
        </Button>
      </div>
    </div>
  )
}
