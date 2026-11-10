import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { TodoDetailForm } from "@/components/diary/todo/TodoDetailForm"
import type { TodoItemRow } from "@/components/diary/todo/sortTodoItems"

export default async function TodoDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("diary_todo_items")
    .select(
      "id, kind, importance, item_date, item_time, target, title, detail, sort_order"
    )
    .eq("id", params.id)
    .maybeSingle()

  if (error) return <p className="p-8 text-sm text-red-600">에러: {error.message}</p>
  if (!data) notFound()

  return (
    <div className="mx-auto max-w-md space-y-4 p-3 md:p-6">
      <TodoDetailForm item={data as TodoItemRow} />
    </div>
  )
}
