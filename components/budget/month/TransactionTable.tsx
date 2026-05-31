"use client"

import {
  TransactionRowComponent,
  type TransactionRowData,
} from "@/components/budget/month/TransactionRow"
import { TransactionAddRow } from "@/components/budget/month/TransactionAddRow"
import type { CategoryOption } from "@/components/budget/settings/CategoryDropdowns"
import { sortTransactionsInGroup } from "@/lib/utils/transactions-sort"

export function TransactionTable({
  type,
  transactions,
  categories,
  paymentMethods,
  ym,
}: {
  type: "income" | "expense"
  transactions: TransactionRowData[]
  categories: CategoryOption[]
  paymentMethods: { id: string; name: string }[]
  ym: string
}) {
  const sorted = sortTransactionsInGroup(transactions)
  const title = type === "expense" ? "💸 출금" : "💰 입금"

  return (
    <div className="rounded border border-neutral-200">
      <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-semibold">
        {title}
      </div>

      <div className="grid grid-cols-[1fr_1fr_50px_120px_1fr_100px_50px_30px] gap-1 border-b border-neutral-200 bg-neutral-50/50 px-2 py-1.5 text-xs font-medium text-neutral-500">
        <span>1차 카테고리</span>
        <span>2차 카테고리</span>
        <span>날짜</span>
        <span>결제수단</span>
        <span>비고</span>
        <span className="text-right">금액</span>
        <span>결제여부</span>
        <span />
      </div>

      {sorted.length === 0 ? (
        <p className="px-3 py-4 text-sm text-neutral-500">
          아직 거래가 없습니다.
        </p>
      ) : (
        sorted.map((row) => (
          <TransactionRowComponent
            key={row.id}
            row={row}
            categories={categories}
            paymentMethods={paymentMethods}
            ym={ym}
          />
        ))
      )}

      <TransactionAddRow
        type={type}
        categories={categories}
        paymentMethods={paymentMethods}
        ym={ym}
      />
    </div>
  )
}
