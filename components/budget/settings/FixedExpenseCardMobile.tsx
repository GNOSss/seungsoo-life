"use client"

import { useState, useTransition } from "react"
import { cn } from "@/lib/utils"
import { updateFixedExpense } from "@/lib/actions/fixed-expenses"
import { toast } from "sonner"
import type { FixedExpenseRow } from "@/components/budget/settings/FixedExpenseRow"

const krwFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
})

export function FixedExpenseCardMobile({
  row,
  onTap,
}: {
  row: FixedExpenseRow
  onTap: () => void
}) {
  const [active, setActive] = useState(row.active)
  const [pending, startTransition] = useTransition()

  const onToggleActive = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (row.id.startsWith("temp-")) return // 미저장 행은 시트로
    const next = !active
    setActive(next)
    startTransition(async () => {
      const result = await updateFixedExpense({ id: row.id, active: next })
      if (!result.ok) {
        setActive(!next)
        toast.error(result.error)
      }
    })
  }

  const dayLabel =
    row.day_of_month === null
      ? "—"
      : row.day_of_month === 0
        ? "날짜 미정"
        : `매월 ${row.day_of_month}일`

  return (
    <div
      className={cn(
        "relative flex flex-col gap-1 rounded border border-neutral-200 bg-white px-3 py-2.5",
        !active && "opacity-50"
      )}
    >
      {/* Row 1: 카테고리 + 일 */}
      <div className="flex items-center justify-between">
        <span className="truncate pr-2 text-sm font-medium">
          {row.category_1st ?? "—"}
          {row.category_2nd ? (
            <>
              <span className="mx-1 text-neutral-400">▸</span>
              {row.category_2nd}
            </>
          ) : null}
        </span>
        <span className="shrink-0 text-xs text-neutral-500">{dayLabel}</span>
      </div>

      {/* Row 2: 종류 · 결제수단 · 비고 */}
      <div className="truncate text-xs text-neutral-500">
        {row.type === "income" ? "수입" : "출금"} · {row.payment_method ?? "—"}
        {row.description ? ` · ${row.description}` : ""}
      </div>

      {/* Row 3: 금액 + active pill */}
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-base font-semibold tabular-nums",
            row.type === "income" ? "text-emerald-600" : "text-neutral-900"
          )}
        >
          {row.amount === null || row.amount === 0
            ? "—"
            : krwFormatter.format(row.amount)}
        </span>
        <button
          type="button"
          onClick={onToggleActive}
          disabled={pending}
          className={cn(
            "relative z-10 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            active
              ? "bg-emerald-500 text-white"
              : "bg-neutral-200 text-neutral-600"
          )}
          aria-label={active ? "활성" : "비활성"}
        >
          {active ? "✓ 활성" : "비활성"}
        </button>
      </div>

      {/* 카드 전체 탭 영역 */}
      <button
        type="button"
        onClick={onTap}
        className="absolute inset-0 rounded"
        aria-label="고정지출 편집"
      />
    </div>
  )
}
