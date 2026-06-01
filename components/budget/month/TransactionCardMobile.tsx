"use client"

import { useState, useTransition, useEffect } from "react"
import { cn } from "@/lib/utils"
import { toggleIsPaid } from "@/lib/actions/transactions"
import { toast } from "sonner"
import type { TransactionRowData } from "@/components/budget/month/TransactionRow"

const krwFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
})

export function TransactionCardMobile({
  row,
  onTap,
}: {
  row: TransactionRowData
  onTap: () => void
}) {
  const [isPaid, setIsPaid] = useState(row.is_paid)
  const [pending, startTransition] = useTransition()

  // 부모가 revalidate 후 새 row.is_paid 전달하면 로컬 state 동기화
  useEffect(() => {
    setIsPaid(row.is_paid)
  }, [row.is_paid])

  const day = Number(row.date.split("-")[2])

  const onTogglePaid = (e: React.MouseEvent) => {
    e.stopPropagation()
    const next = !isPaid
    setIsPaid(next) // 낙관적
    startTransition(async () => {
      const result = await toggleIsPaid({ id: row.id, is_paid: next })
      if (!result.ok) {
        setIsPaid(!next) // 롤백
        toast.error(result.error)
      }
    })
  }

  return (
    <div
      className={cn(
        "relative flex flex-col gap-1 rounded border border-neutral-200 bg-white px-3 py-2.5",
        row.is_fixed && "border-l-4 border-l-blue-500 bg-blue-50/30",
        !isPaid && row.type === "expense" && "ring-1 ring-amber-200"
      )}
    >
      {/* Row 1: 카테고리 + 일 */}
      <div className="flex items-center justify-between">
        <span className="truncate pr-2 text-sm font-medium">
          {row.category_1st}
          {row.category_2nd ? (
            <>
              <span className="mx-1 text-neutral-400">▸</span>
              {row.category_2nd}
            </>
          ) : null}
        </span>
        <span className="shrink-0 text-xs text-neutral-500 tabular-nums">
          {day}일
        </span>
      </div>

      {/* Row 2: 결제수단 · 비고 */}
      <div className="truncate text-xs text-neutral-500">
        {row.payment_method ?? "—"}
        {row.description ? ` · ${row.description}` : ""}
      </div>

      {/* Row 3: 금액 + pill */}
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-base font-semibold tabular-nums",
            row.type === "income" ? "text-emerald-600" : "text-neutral-900"
          )}
        >
          {krwFormatter.format(row.amount)}
        </span>
        <button
          type="button"
          onClick={onTogglePaid}
          disabled={pending}
          className={cn(
            "relative z-10 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            isPaid
              ? "bg-emerald-500 text-white"
              : "bg-neutral-200 text-neutral-600"
          )}
          aria-label={isPaid ? "결제 완료" : "결제 대기"}
        >
          {isPaid ? "✓ 완료" : "대기"}
        </button>
      </div>

      {/* 카드 전체 탭 영역 (pill 제외) */}
      <button
        type="button"
        onClick={onTap}
        className="absolute inset-0 rounded"
        aria-label="거래 편집"
      />
    </div>
  )
}
