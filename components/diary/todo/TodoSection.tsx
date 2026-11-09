"use client"

import { useState } from "react"
import { TodoList } from "./TodoList"
import { TodoAddRow } from "./TodoAddRow"
import { TodoDetailModal } from "./TodoDetailModal"
import type { TodoItemRow } from "./sortTodoItems"
import type { TodoItemKind } from "@/lib/validators/diary-todo-items"

export function TodoSection({
  kind,
  items,
}: {
  kind: TodoItemKind
  items: TodoItemRow[]
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const selected = items.find((i) => i.id === openId) ?? null

  return (
    <div className="rounded border border-neutral-200">
      <TodoList items={items} onOpenDetail={setOpenId} />
      <TodoAddRow kind={kind} />
      <TodoDetailModal
        item={selected}
        open={openId !== null}
        onOpenChange={(open) => !open && setOpenId(null)}
      />
    </div>
  )
}
