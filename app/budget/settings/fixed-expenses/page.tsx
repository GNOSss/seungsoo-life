import { createClient } from "@/lib/supabase/server"
import { FixedExpenseTable } from "@/components/budget/settings/FixedExpenseTable"
import type { FixedExpenseRow } from "@/components/budget/settings/FixedExpenseRow"

export default async function FixedExpensesPage() {
  const supabase = await createClient()

  const [
    { data: fixedExpenses, error: fxErr },
    { data: categories, error: catErr },
    { data: paymentMethods, error: pmErr },
  ] = await Promise.all([
    supabase
      .from("fixed_expenses")
      .select(
        "id, day_of_month, type, category_1st, category_2nd, payment_method, description, amount, active"
      )
      .order("day_of_month", { ascending: true })
      .order("id", { ascending: true }),
    supabase
      .from("categories")
      .select("id, name, type, parent_id")
      .order("type", { ascending: true })
      .order("sort_order", { ascending: true }),
    supabase
      .from("payment_methods")
      .select("id, name")
      .eq("active", true)
      .order("sort_order", { ascending: true }),
  ])

  if (fxErr || catErr || pmErr) {
    const msg = fxErr?.message ?? catErr?.message ?? pmErr?.message
    return <p className="text-sm text-red-600">에러: {msg}</p>
  }

  const rows: FixedExpenseRow[] = (fixedExpenses ?? []).map((r) => ({
    id: r.id,
    day_of_month: r.day_of_month,
    type: r.type as "income" | "expense",
    category_1st: r.category_1st,
    category_2nd: r.category_2nd,
    payment_method: r.payment_method,
    description: r.description,
    amount: r.amount === null ? null : Number(r.amount),
    active: r.active,
  }))

  return (
    <FixedExpenseTable
      rows={rows}
      categories={(categories ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type as "income" | "expense",
        parent_id: c.parent_id,
      }))}
      paymentMethods={paymentMethods ?? []}
    />
  )
}
