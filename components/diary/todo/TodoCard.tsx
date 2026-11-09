"use client"

import { cn } from "@/lib/utils"
import { ImportanceBadge } from "./ImportanceBadge"
import type { TodoItemRow } from "./sortTodoItems"
import { getKoreanWeekday, formatYymmdd, formatHm, isPastDate } from "@/lib/utils/diary-todo-date"
import { updateTodoItem } from "@/lib/actions/diary-todo-items"
import type { TodoItemImportance } from "@/lib/validators/diary-todo-items"

export function TodoCard({
  item,
  onOpenDetail,
}: {
  item: TodoItemRow
  onOpenDetail: (id: string) => void
}) {
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
          <span className={cn("text-xs tabular-nums text-neutral-500", past && "text-red-600")}>
            {formatYymmdd(item.item_date!)}({getKoreanWeekday(item.item_date!)})
            {item.item_time ? ` ${formatHm(item.item_time)}` : ""}
          </span>
        )}
      </div>
      <p className="mt-1 font-bold">{item.title}</p>
      {item.target && (
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs text-neutral-500">👤 {item.target}</span>
          <button
            type="button"
            onClick={() => onOpenDetail(item.id)}
            className="text-xs text-neutral-400"
          >
            상세 ⋯
          </button>
        </div>
      )}
      {!item.target && (
        <div className="mt-1 flex justify-end">
          <button
            type="button"
            onClick={() => onOpenDetail(item.id)}
            className="text-xs text-neutral-400"
          >
            상세 ⋯
          </button>
        </div>
      )}
    </div>
  )
}
