"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  FixedExpenseRowComponent,
  type FixedExpenseRow,
} from "@/components/budget/settings/FixedExpenseRow"
import type { CategoryOption } from "@/components/budget/settings/CategoryDropdowns"

export function FixedExpenseTable({
  rows,
  categories,
  paymentMethods,
}: {
  rows: FixedExpenseRow[]
  categories: CategoryOption[]
  paymentMethods: { id: string; name: string }[]
}) {
  const [tempRows, setTempRows] = useState<FixedExpenseRow[]>([])

  const allRows = [...rows, ...tempRows]

  const addEmptyRow = () => {
    setTempRows((prev) => [
      ...prev,
      {
        id: `temp-${crypto.randomUUID()}`,
        day_of_month: null,
        type: "expense" as const,
        category_1st: null,
        category_2nd: null,
        payment_method: null,
        description: null,
        amount: null,
        active: true,
      },
    ])
  }

  const removeTempRow = (id: string) => {
    setTempRows((prev) => prev.filter((r) => r.id !== id))
  }

  const onPersisted = (tempId: string) => {
    // 저장 성공 → temp 행 제거 (revalidatePath로 실제 행이 rows props에 등장)
    setTempRows((prev) => prev.filter((r) => r.id !== tempId))
  }

  return (
    <div className="rounded border border-neutral-200">
      <div className="grid grid-cols-[70px_60px_80px_1fr_1fr_120px_1fr_120px_40px] gap-2 border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-500">
        <span>활성</span>
        <span>일</span>
        <span>종류</span>
        <span>1차</span>
        <span>2차</span>
        <span>결제수단</span>
        <span>비고</span>
        <span className="text-right">금액</span>
        <span />
      </div>

      {allRows.length === 0 ? (
        <p className="px-3 py-4 text-sm text-neutral-500">
          아직 고정지출이 없습니다. 하단 + 새 행으로 추가하세요.
        </p>
      ) : (
        allRows.map((row) => (
          <FixedExpenseRowComponent
            key={row.id}
            row={row}
            categories={categories}
            paymentMethods={paymentMethods}
            onRemove={removeTempRow}
            onPersisted={onPersisted}
          />
        ))
      )}

      <div className="border-t border-neutral-200 p-3">
        <Button size="sm" onClick={addEmptyRow}>
          + 새 행
        </Button>
      </div>
    </div>
  )
}
