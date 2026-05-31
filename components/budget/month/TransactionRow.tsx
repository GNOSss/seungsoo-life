"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  CategoryDropdowns,
  type CategoryOption,
} from "@/components/budget/settings/CategoryDropdowns"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DeleteConfirmDialog } from "@/components/budget/settings/DeleteConfirmDialog"
import {
  updateTransaction,
  deleteTransaction,
  toggleIsPaid,
} from "@/lib/actions/transactions"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { ymWithDay } from "@/lib/utils/ym"

export type TransactionRowData = {
  id: string
  year_month: string
  date: string // YYYY-MM-DD
  type: "income" | "expense"
  category_1st: string
  category_2nd: string | null
  payment_method: string | null
  description: string | null
  amount: number
  is_paid: boolean
  is_fixed: boolean
}

export function TransactionRowComponent({
  row,
  categories,
  paymentMethods,
  ym,
}: {
  row: TransactionRowData
  categories: CategoryOption[]
  paymentMethods: { id: string; name: string }[]
  ym: string
}) {
  const [draft, setDraft] = useState<TransactionRowData>(row)
  const [askDelete, setAskDelete] = useState(false)
  const [pending, startTransition] = useTransition()

  // date "YYYY-MM-DD"에서 day만 추출 (UI 표시용)
  const dayOfMonth = Number(draft.date.split("-")[2])

  const persist = (next: TransactionRowData) => {
    startTransition(async () => {
      const result = await updateTransaction({
        id: next.id,
        year_month: next.year_month,
        date: next.date,
        type: next.type,
        category_1st: next.category_1st,
        category_2nd: next.category_2nd,
        payment_method: next.payment_method,
        description: next.description,
        amount: next.amount,
        is_paid: next.is_paid,
      })
      if (!result.ok) toast.error(result.error)
    })
  }

  const onChangeCategory = (next: {
    category_1st?: string | null
    category_2nd?: string | null
  }) => {
    const updated: TransactionRowData = {
      ...draft,
      ...(next.category_1st !== undefined
        ? { category_1st: next.category_1st ?? "" }
        : {}),
      ...(next.category_2nd !== undefined
        ? { category_2nd: next.category_2nd }
        : {}),
    }
    setDraft(updated)
    if (updated.category_1st) persist(updated)
  }

  const onChangePaymentMethod = (v: string | null) => {
    const updated = { ...draft, payment_method: v || null }
    setDraft(updated)
    persist(updated)
  }

  const onChangeDay = (dayStr: string) => {
    const day = Number(dayStr)
    if (!day || day < 1 || day > 31) {
      setDraft({ ...draft, date: dayStr ? draft.date : draft.date })
      return
    }
    const newDate = ymWithDay(ym, day)
    setDraft({ ...draft, date: newDate })
  }

  const onBlurDay = () => {
    persist(draft)
  }

  const onChangeDescription = (v: string) => {
    setDraft({ ...draft, description: v || null })
  }

  const onChangeAmount = (vStr: string) => {
    const digits = vStr.replace(/\D/g, "")
    setDraft({ ...draft, amount: digits ? Number(digits) : 0 })
  }

  const onBlurField = () => {
    persist(draft)
  }

  const onToggleIsPaid = (v: boolean) => {
    setDraft({ ...draft, is_paid: v })
    startTransition(async () => {
      const result = await toggleIsPaid({ id: draft.id, is_paid: v })
      if (!result.ok) toast.error(result.error)
    })
  }

  const onConfirmDelete = () =>
    new Promise<void>((resolve) => {
      startTransition(async () => {
        const result = await deleteTransaction({ id: draft.id })
        if (!result.ok) toast.error(result.error)
        resolve()
      })
    })

  return (
    <div
      className={cn(
        "grid grid-cols-[1fr_1fr_45px_100px_1fr_120px_70px_30px] items-center gap-1 border-b border-neutral-100 px-2 py-1.5 text-sm",
        draft.is_fixed && "border-l-4 border-l-blue-500 bg-blue-50/30"
      )}
    >
      <CategoryDropdowns
        categories={categories}
        type={draft.type}
        value1st={draft.category_1st}
        value2nd={draft.category_2nd}
        onChange={onChangeCategory}
        disabled={pending}
      />
      {/* CategoryDropdowns가 fragment로 1차/2차 2 cell 채움 */}

      <input
        type="number"
        min={1}
        max={31}
        value={dayOfMonth || ""}
        onChange={(e) => onChangeDay(e.target.value)}
        onBlur={onBlurDay}
        disabled={pending}
        className="w-full rounded border border-neutral-300 px-1 py-0.5 text-center"
        placeholder="일"
      />

      <Select
        value={draft.payment_method ?? ""}
        onValueChange={onChangePaymentMethod}
        disabled={pending}
      >
        <SelectTrigger>
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          {paymentMethods.map((pm) => (
            <SelectItem key={pm.id} value={pm.name}>
              {pm.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <input
        type="text"
        value={draft.description ?? ""}
        onChange={(e) => onChangeDescription(e.target.value)}
        onBlur={onBlurField}
        disabled={pending}
        className="w-full rounded border border-neutral-300 px-1 py-0.5"
        placeholder="비고"
      />

      <input
        type="text"
        inputMode="numeric"
        value={draft.amount ? draft.amount.toLocaleString("ko-KR") : ""}
        onChange={(e) => onChangeAmount(e.target.value)}
        onBlur={onBlurField}
        disabled={pending}
        className="w-full rounded border border-neutral-300 px-1 py-0.5 text-right tabular-nums"
        placeholder="금액"
      />

      <div className="flex items-center justify-center rounded bg-neutral-100/60 py-1">
        <Switch
          checked={draft.is_paid}
          onCheckedChange={onToggleIsPaid}
          disabled={pending}
        />
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setAskDelete(true)}
        aria-label="삭제"
      >
        🗑️
      </Button>

      <DeleteConfirmDialog
        open={askDelete}
        onOpenChange={setAskDelete}
        title="거래 삭제"
        message="이 거래를 삭제합니다. 월별 요약이 자동 갱신됩니다."
        onConfirm={onConfirmDelete}
      />
    </div>
  )
}
