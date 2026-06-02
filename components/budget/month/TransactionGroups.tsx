"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { TransactionTable } from "@/components/budget/month/TransactionTable"
import { TransactionCardList } from "@/components/budget/month/TransactionCardList"
import type { TransactionRowData } from "@/components/budget/month/TransactionRow"
import type { CategoryOption } from "@/components/budget/settings/CategoryDropdowns"
import type { SortMode } from "@/lib/utils/transactions-sort"

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
  const [sortMode, setSortMode] = useState<SortMode>("alpha")
  const expense = transactions.filter((t) => t.type === "expense")
  const income = transactions.filter((t) => t.type === "income")

  return (
    <>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-neutral-500">정렬:</span>
        <button
          type="button"
          onClick={() => setSortMode("alpha")}
          className={cn(
            "rounded-full px-3 py-1 font-medium transition-colors",
            sortMode === "alpha"
              ? "bg-neutral-900 text-white"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          )}
        >
          가나다
        </button>
        <button
          type="button"
          onClick={() => setSortMode("amount")}
          className={cn(
            "rounded-full px-3 py-1 font-medium transition-colors",
            sortMode === "amount"
              ? "bg-neutral-900 text-white"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          )}
        >
          금액 큰 순
        </button>
      </div>

      {/* Mobile: 카드 스택 (출금 → 입금) */}
      <div className="space-y-4 md:hidden">
        <TransactionCardList
          type="expense"
          transactions={expense}
          categories={categories}
          paymentMethods={paymentMethods}
          ym={ym}
          sortMode={sortMode}
        />
        <TransactionCardList
          type="income"
          transactions={income}
          categories={categories}
          paymentMethods={paymentMethods}
          ym={ym}
          sortMode={sortMode}
        />
      </div>

      {/* Desktop: 기존 8col 테이블 그대로. 출금/입금 세로 스택 기본, 2xl(1536+)에서만 2열. */}
      <div className="hidden gap-4 md:grid 2xl:grid-cols-2">
        <TransactionTable
          type="expense"
          transactions={expense}
          categories={categories}
          paymentMethods={paymentMethods}
          ym={ym}
          sortMode={sortMode}
        />
        <TransactionTable
          type="income"
          transactions={income}
          categories={categories}
          paymentMethods={paymentMethods}
          ym={ym}
          sortMode={sortMode}
        />
      </div>
    </>
  )
}
