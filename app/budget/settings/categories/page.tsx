import { createClient } from "@/lib/supabase/server"
import { CategoryTree } from "@/components/budget/settings/CategoryTree"

export default async function CategoriesPage() {
  const supabase = await createClient()
  const { data: categories, error } = await supabase
    .from("categories")
    .select("id, name, type, parent_id, sort_order")
    .order("type", { ascending: true })
    .order("parent_id", { ascending: true, nullsFirst: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  if (error) {
    return <p className="text-sm text-red-600">에러: {error.message}</p>
  }

  const typed = (categories ?? []).map((c) => ({
    ...c,
    type: c.type as "income" | "expense",
  }))

  return <CategoryTree categories={typed} />
}
