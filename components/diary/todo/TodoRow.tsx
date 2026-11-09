"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { ImportanceBadge } from "./ImportanceBadge"
import type { TodoItemRow } from "./sortTodoItems"
import { getKoreanWeekday, formatYymmdd, formatHm, isPastDate } from "@/lib/utils/diary-todo-date"
import { updateTodoItem } from "@/lib/actions/diary-todo-items"
import type { TodoItemImportance } from "@/lib/validators/diary-todo-items"

export function TodoRow({
  item,
  onOpenDetail,
}: {
  item: TodoItemRow
  onOpenDetail: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(item.title)

  const saveTitle = () => {
    setEditing(false)
    const trimmed = title.trim()
    if (!trimmed || trimmed === item.title) {
      setTitle(item.title)
      return
    }
    updateTodoItem({ id: item.id, title: trimmed })
  }

  const cycleImportance = (next: TodoItemImportance) => {
    updateTodoItem({ id: item.id, importance: next })
  }

  const past = item.item_date ? isPastDate(item.item_date) : false

  return (
    <div className="hidden items-center gap-2 border-b border-neutral-100 px-2 py-2 text-sm md:grid md:grid-cols-[56px_72px_36px_56px_1fr_2fr_32px]">
      <ImportanceBadge importance={item.importance} onCycle={cycleImportance} />
      <span className={cn("tabular-nums", past && "text-red-600")}>
        {item.item_date ? formatYymmdd(item.item_date) : "—"}
      </span>
      <span>{item.item_date ? getKoreanWeekday(item.item_date) : "—"}</span>
      <span className="tabular-nums">{item.item_time ? formatHm(item.item_time) : "—"}</span>
      <span className="ml-1 truncate text-neutral-500">{item.target ?? "—"}</span>
      {editing ? (
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveTitle()
            if (e.key === "Escape") {
              setTitle(item.title)
              setEditing(false)
            }
          }}
          className="rounded border border-neutral-300 px-1 py-0.5"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="truncate text-left font-bold"
        >
          {item.title}
        </button>
      )}
      <button
        type="button"
        onClick={() => onOpenDetail(item.id)}
        className="text-neutral-400 hover:text-neutral-700"
        aria-label="상세보기"
      >
        ⋯
      </button>
    </div>
  )
}
