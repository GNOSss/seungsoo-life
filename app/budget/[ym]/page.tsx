import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { isValidYm, formatYmKorean } from "@/lib/utils/ym"
import { CreateMonthButton } from "@/components/budget/sidebar/CreateMonthButton"
import {
  MonthlySummary,
  type MonthlySummaryData,
} from "@/components/budget/month/MonthlySummary"
import { TransactionGroups } from "@/components/budget/month/TransactionGroups"
import type { TransactionRowData } from "@/components/budget/month/TransactionRow"
import type { CategoryOption } from "@/components/budget/settings/CategoryDropdowns"

export default async function MonthPage({
  params,
}: {
  params: { ym: string }
}) {
  if (!isValidYm(params.ym)) notFound()

  const supabase = await createClient()

  const [
    { data: summary, error: sumErr },
    { data: transactions, error: txErr },
    { data: categories, error: catErr },
    { data: paymentMethods, error: pmErr },
  ] = await Promise.all([
    supabase
      .from("monthly_summaries")
      .select(
        "opening_balance, income_total, expense_total, paid_total, unpaid_total, current_balance, expected_balance"
      )
      .eq("year_month", params.ym)
      .maybeSingle(),
    supabase
      .from("transactions")
      .select(
        "id, year_month, date, type, category_1st, category_2nd, payment_method, description, amount, is_paid, is_fixed"
      )
      .eq("year_month", params.ym),
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

  if (sumErr || txErr || catErr || pmErr) {
    const msg = sumErr?.message ?? txErr?.message ?? catErr?.message ?? pmErr?.message
    return <p className="p-8 text-sm text-red-600">에러: {msg}</p>
  }

  if (!summary) {
    return <NoMonthYet ym={params.ym} />
  }

  // monthly_summaries 컬럼은 numeric → string으로 반환되므로 Number() cast
  const summaryData: MonthlySummaryData = {
    opening_balance: Number(summary.opening_balance),
    income_total: Number(summary.income_total),
    expense_total: Number(summary.expense_total),
    paid_total: Number(summary.paid_total),
    unpaid_total: Number(summary.unpaid_total),
    current_balance: Number(summary.current_balance),
    expected_balance: Number(summary.expected_balance),
  }

  const rows: TransactionRowData[] = (transactions ?? []).map((t) => ({
    id: t.id,
    year_month: t.year_month,
    date: t.date,
    type: t.type as "income" | "expense",
    category_1st: t.category_1st,
    category_2nd: t.category_2nd,
    payment_method: t.payment_method,
    description: t.description,
    amount: Number(t.amount),
    is_paid: t.is_paid,
    is_fixed: t.is_fixed,
  }))

  const cats: CategoryOption[] = (categories ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type as "income" | "expense",
    parent_id: c.parent_id,
  }))

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">{formatYmKorean(params.ym)}</h1>
      <MonthlySummary summary={summaryData} />
      <TransactionGroups
        transactions={rows}
        categories={cats}
        paymentMethods={paymentMethods ?? []}
        ym={params.ym}
      />
    </div>
  )
}

function NoMonthYet({ ym }: { ym: string }) {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h1 className="text-2xl font-bold">{formatYmKorean(ym)}</h1>
      <p className="mt-4 text-sm text-neutral-500">
        이 월은 아직 생성되지 않았습니다.
      </p>
      <div className="mt-6">
        <CreateMonthButton ym={ym} label="이 월 생성" variant="primary" />
      </div>
    </div>
  )
}
