"use client"

import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { ImportanceBadge } from "./ImportanceBadge"
import type { TodoItemRow } from "./sortTodoItems"
import { getKoreanWeekday, formatYymmdd, formatHm, isPastDate } from "@/lib/utils/diary-todo-date"
import { updateTodoItem } from "@/lib/actions/diary-todo-items"
import type { TodoItemImportance } from "@/lib/validators/diary-todo-items"

export function TodoCard({ item }: { item: TodoItemRow }) {
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
  const hasSchedule = item.item_date !== null

  return (
    <div className="border-b border-neutral-100 px-2 py-2 md:hidden">
      <div className="flex items-center justify-between">
        <ImportanceBadge importance={item.importance} onCycle={cycleImportance} />
        {hasSchedule && (
          <span className="text-xs text-neutral-500">
            <span className={cn("font-bold tabular-nums", past && "text-red-600")}>
              {formatYymmdd(item.item_date!)}
            </span>
            ({getKoreanWeekday(item.item_date!)})
            {item.item_time ? ` ${formatHm(item.item_time)}` : ""}
          </span>
        )}
      </div>

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
          className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 font-bold"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-1 block w-full text-left font-bold"
        >
          {item.title}
        </button>
      )}

      {item.target && (
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs text-neutral-500">👤 {item.target}</span>
          <Link href={`/diary/notes/${item.id}`} className="text-xs text-neutral-400">
            상세 ⋯
          </Link>
        </div>
      )}
      {!item.target && (
        <div className="mt-1 flex justify-end">
          <Link href={`/diary/notes/${item.id}`} className="text-xs text-neutral-400">
            상세 ⋯
          </Link>
        </div>
      )}
    </div>
  )
}
