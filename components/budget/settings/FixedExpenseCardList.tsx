"use client"

import { useState } from "react"
import { FixedExpenseCardMobile } from "@/components/budget/settings/FixedExpenseCardMobile"
import { FixedExpenseEditSheet } from "@/components/budget/settings/FixedExpenseEditSheet"
import type { FixedExpenseRow } from "@/components/budget/settings/FixedExpenseRow"
import type { CategoryOption } from "@/components/budget/settings/CategoryDropdowns"

type EditingId = string | "new" | null

export function FixedExpenseCardList({
  rows,
  categories,
  paymentMethods,
}: {
  rows: FixedExpenseRow[]
  categories: CategoryOption[]
  paymentMethods: { id: string; name: string }[]
}) {
  const [editingId, setEditingId] = useState<EditingId>(null)

  const sheetOpen = editingId !== null
  const mode = editingId === "new" ? "add" : "edit"
  const initial =
    editingId !== "new" && editingId !== null
      ? rows.find((r) => r.id === editingId) ?? null
      : null

  return (
    <div className="space-y-1.5">
      {rows.length === 0 ? (
        <p className="px-1 py-4 text-sm text-neutral-500">
          아직 고정지출이 없습니다.
        </p>
      ) : (
        rows.map((row) => (
          <FixedExpenseCardMobile
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
        고정지출 추가
      </button>

      <FixedExpenseEditSheet
        open={sheetOpen}
        mode={mode}
        initial={initial}
        categories={categories}
        paymentMethods={paymentMethods}
        onClose={() => setEditingId(null)}
      />
    </div>
  )
}
