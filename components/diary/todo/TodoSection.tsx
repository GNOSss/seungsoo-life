"use client"

import { useState } from "react"
import { TodoList } from "./TodoList"
import { TodoAddRow } from "./TodoAddRow"
import type { TodoItemRow, TodoSortMode } from "./sortTodoItems"
import type { TodoItemKind } from "@/lib/validators/diary-todo-items"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const SORT_LABELS: Record<TodoSortMode, string> = {
  default: "날짜순",
  importance: "중요도순",
  created: "등록순",
}

export function TodoSection({
  kind,
  items,
}: {
  kind: TodoItemKind
  items: TodoItemRow[]
}) {
  const [sortMode, setSortMode] = useState<TodoSortMode>("default")

  return (
    <div className="rounded border border-neutral-200">
      <div className="flex justify-end border-b border-neutral-100 px-2 py-1.5">
        <Select value={sortMode} onValueChange={(v) => setSortMode(v as TodoSortMode)}>
          <SelectTrigger className="h-7 w-28 text-xs">
            <SelectValue>{SORT_LABELS[sortMode]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">날짜순</SelectItem>
            <SelectItem value="importance">중요도순</SelectItem>
            <SelectItem value="created">등록순</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <TodoList items={items} sortMode={sortMode} />
      <TodoAddRow kind={kind} />
    </div>
  )
}
