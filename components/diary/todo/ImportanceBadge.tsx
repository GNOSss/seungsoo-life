"use client"

import { cn } from "@/lib/utils"
import type { TodoItemImportance } from "@/lib/validators/diary-todo-items"

const LABELS: Record<TodoItemImportance, string> = {
  high: "높음",
  mid: "중간",
  low: "낮음",
}

const STYLES: Record<TodoItemImportance, string> = {
  high: "bg-red-100 text-red-700",
  mid: "bg-yellow-100 text-yellow-700",
  low: "bg-emerald-100 text-emerald-700",
}

const NEXT: Record<TodoItemImportance, TodoItemImportance> = {
  high: "mid",
  mid: "low",
  low: "high",
}

export function ImportanceBadge({
  importance,
  onCycle,
}: {
  importance: TodoItemImportance
  onCycle?: (next: TodoItemImportance) => void
}) {
  const className = cn(
    "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium",
    STYLES[importance]
  )

  if (!onCycle) return <span className={className}>{LABELS[importance]}</span>

  return (
    <button
      type="button"
      className={cn(className, "transition-opacity hover:opacity-80")}
      onClick={() => onCycle(NEXT[importance])}
    >
      {LABELS[importance]}
    </button>
  )
}
