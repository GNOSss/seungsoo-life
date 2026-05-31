"use client"

import {
  TransactionTable,
} from "@/components/budget/month/TransactionTable"
import type { TransactionRowData } from "@/components/budget/month/TransactionRow"
import type { CategoryOption } from "@/components/budget/settings/CategoryDropdowns"

export function TransactionGroups({
  transactions,
  categories,
  paymentMethods,
  ym,
}: {
  transactions: TransactionRowData[]
  categories: CategoryOption[]
  paymentMethods: { id: string; name: string }[]
  ym: string
}) {
  const expense = transactions.filter((t) => t.type === "expense")
  const income = transactions.filter((t) => t.type === "income")

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <TransactionTable
        type="expense"
        transactions={expense}
        categories={categories}
        paymentMethods={paymentMethods}
        ym={ym}
      />
      <TransactionTable
        type="income"
        transactions={income}
        categories={categories}
        paymentMethods={paymentMethods}
        ym={ym}
      />
    </div>
  )
}
