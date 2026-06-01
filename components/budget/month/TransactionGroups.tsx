"use client"

import { TransactionTable } from "@/components/budget/month/TransactionTable"
import { TransactionCardList } from "@/components/budget/month/TransactionCardList"
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
    <>
      {/* Mobile: 카드 스택 (출금 → 입금) */}
      <div className="space-y-4 md:hidden">
        <TransactionCardList
          type="expense"
          transactions={expense}
          categories={categories}
          paymentMethods={paymentMethods}
          ym={ym}
        />
        <TransactionCardList
          type="income"
          transactions={income}
          categories={categories}
          paymentMethods={paymentMethods}
          ym={ym}
        />
      </div>

      {/* Desktop: 기존 8col 테이블 그대로 */}
      <div className="hidden gap-4 md:grid xl:grid-cols-2">
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
    </>
  )
}
