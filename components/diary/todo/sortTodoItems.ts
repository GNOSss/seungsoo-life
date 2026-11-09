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

export type TodoSortMode = "default" | "importance" | "created"

const IMPORTANCE_RANK: Record<TodoItemImportance, number> = {
  high: 0,
  mid: 1,
  low: 2,
}

export function sortTodoItems(
  items: TodoItemRow[],
  mode: TodoSortMode = "default"
): TodoItemRow[] {
  if (mode === "created") {
    return [...items].sort((a, b) => a.sort_order - b.sort_order)
  }

  if (mode === "importance") {
    return [...items].sort(
      (a, b) =>
        IMPORTANCE_RANK[a.importance] - IMPORTANCE_RANK[b.importance] ||
        a.sort_order - b.sort_order
    )
  }

  // default: 날짜 있는 항목(스케줄) 먼저 날짜·시간순, 그 다음 메모 항목은 등록순
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
