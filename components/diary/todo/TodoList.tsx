"use client"

import { TodoRow } from "./TodoRow"
import { TodoCard } from "./TodoCard"
import { sortTodoItems, type TodoItemRow } from "./sortTodoItems"

export function TodoList({
  items,
  onOpenDetail,
}: {
  items: TodoItemRow[]
  onOpenDetail: (id: string) => void
}) {
  const sorted = sortTodoItems(items)

  if (sorted.length === 0) {
    return <p className="px-2 py-4 text-sm text-neutral-400">항목이 없습니다.</p>
  }

  return (
    <div>
      {sorted.map((item) => (
        <div key={item.id}>
          <TodoRow item={item} onOpenDetail={onOpenDetail} />
          <TodoCard item={item} onOpenDetail={onOpenDetail} />
        </div>
      ))}
    </div>
  )
}
