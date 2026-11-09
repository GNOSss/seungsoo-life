import type {
  TodoItemImportance,
  TodoItemKind,
} from "@/lib/validators/diary-todo-items"

export type TodoItemRow = {
  id: string
  kind: TodoItemKind
  importance: TodoItemImportance
  item_date: string | null
  item_time: string | null
  target: string | null
  title: string
  detail: string | null
  sort_order: number
}

export function sortTodoItems(items: TodoItemRow[]): TodoItemRow[] {
  const scheduled = items.filter((i) => i.item_date !== null)
  const memo = items.filter((i) => i.item_date === null)

  scheduled.sort((a, b) =>
    (a.item_date! + (a.item_time ?? "00:00")).localeCompare(
      b.item_date! + (b.item_time ?? "00:00")
    )
  )
  memo.sort((a, b) => a.sort_order - b.sort_order)

  return [...scheduled, ...memo]
}
