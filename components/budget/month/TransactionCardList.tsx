"use client"

import { useState } from "react"
import { TransactionCardMobile } from "@/components/budget/month/TransactionCardMobile"
import { TransactionEditSheet } from "@/components/budget/month/TransactionEditSheet"
import type { TransactionRowData } from "@/components/budget/month/TransactionRow"
import type { CategoryOption } from "@/components/budget/settings/CategoryDropdowns"
import { sortTransactionsInGroup } from "@/lib/utils/transactions-sort"

type EditingId = string | "new" | null

export function TransactionCardList({
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
  const [editingId, setEditingId] = useState<EditingId>(null)
  const sorted = sortTransactionsInGroup(transactions)
  const title = type === "expense" ? "💸 출금" : "💰 입금"

  const sheetOpen = editingId !== null
  const mode = editingId === "new" ? "add" : "edit"
  const initial =
    editingId !== "new" && editingId !== null
      ? transactions.find((t) => t.id === editingId) ?? null
      : null

  return (
    <div className="rounded border border-neutral-200">
      <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-semibold">
        {title}
      </div>

      <div className="space-y-1.5 p-2">
        {sorted.length === 0 ? (
          <p className="px-1 py-4 text-sm text-neutral-500">
            아직 거래가 없습니다.
          </p>
        ) : (
          sorted.map((row) => (
            <TransactionCardMobile
              key={row.id}
              row={row}
              onTap={() => setEditingId(row.id)}
            />
          ))
        )}

        <button
          type="button"
          onClick={() => setEditingId("new")}
          className="flex w-full items-center justify-center gap-2 rounded border-2 border-dashed border-neutral-300 py-3 text-sm font-medium text-neutral-600 hover:border-neutral-400"
        >
          <span className="text-lg leading-none">+</span>
          {type === "expense" ? "출금 추가" : "입금 추가"}
        </button>
      </div>

      <TransactionEditSheet
        open={sheetOpen}
        mode={mode}
        initial={initial}
        ym={ym}
        categories={categories}
        paymentMethods={paymentMethods}
        defaultType={type}
        onClose={() => setEditingId(null)}
      />
    </div>
  )
}
