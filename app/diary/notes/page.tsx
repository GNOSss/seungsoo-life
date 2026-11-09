import { createClient } from "@/lib/supabase/server"
import { TodoSection } from "@/components/diary/todo/TodoSection"
import type { TodoItemRow } from "@/components/diary/todo/sortTodoItems"

export default async function DiaryNotesPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("diary_todo_items")
    .select(
      "id, kind, importance, item_date, item_time, target, title, detail, sort_order"
    )
    .order("created_at", { ascending: true })

  if (error)
    return <p className="p-8 text-sm text-red-600">에러: {error.message}</p>

  const items = (data ?? []) as TodoItemRow[]
  const todoItems = items.filter((i) => i.kind === "todo")
  const wishItems = items.filter((i) => i.kind === "wish")

  return (
    <div className="space-y-4 p-3 md:space-y-6 md:p-6">
      <h1 className="text-xl font-bold md:text-2xl">📋 할 것 / 하고 싶은 것</h1>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div>
          <h2 className="mb-2 text-xs font-medium text-neutral-500">📋 할 것</h2>
          <TodoSection kind="todo" items={todoItems} />
        </div>
        <div>
          <h2 className="mb-2 text-xs font-medium text-neutral-500">⭐ 하고 싶은 것</h2>
          <TodoSection kind="wish" items={wishItems} />
        </div>
      </div>
    </div>
  )
}
