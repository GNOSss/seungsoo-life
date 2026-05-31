"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CategoryDropdowns,
  type CategoryOption,
} from "@/components/budget/settings/CategoryDropdowns"
import { DeleteConfirmDialog } from "@/components/budget/settings/DeleteConfirmDialog"
import {
  addFixedExpense,
  updateFixedExpense,
  deleteFixedExpense,
} from "@/lib/actions/fixed-expenses"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export type FixedExpenseRow = {
  id: string  // "temp-..." for new unsaved rows
  day_of_month: number | null
  type: "income" | "expense"
  category_1st: string | null
  category_2nd: string | null
  payment_method: string | null
  description: string | null
  amount: number | null
  active: boolean
}

export function FixedExpenseRowComponent({
  row,
  categories,
  paymentMethods,
  onRemove,
  onPersisted,
}: {
  row: FixedExpenseRow
  categories: CategoryOption[]
  paymentMethods: { id: string; name: string }[]
  onRemove: (id: string) => void
  onPersisted: (tempId: string) => void
}) {
  const [draft, setDraft] = useState<FixedExpenseRow>(row)
  const [askDelete, setAskDelete] = useState(false)
  const [pending, startTransition] = useTransition()
  const isNew = draft.id.startsWith("temp-")

  const persist = (next: FixedExpenseRow) => {
    if (!allRequiredFilled(next)) return // 필수 미충족이면 저장 안 함

    startTransition(async () => {
      if (isNew) {
        const result = await addFixedExpense({
          day_of_month: next.day_of_month!,
          type: next.type,
          category_1st: next.category_1st!,
          category_2nd: next.category_2nd ?? null,
          payment_method: next.payment_method ?? null,
          description: next.description ?? null,
          amount: next.amount!,
        })
        if (!result.ok) {
          toast.error(result.error)
          return
        }
        if (result.id) onPersisted(draft.id)
      } else {
        const result = await updateFixedExpense({
          id: next.id,
          day_of_month: next.day_of_month ?? undefined,
          type: next.type,
          category_1st: next.category_1st ?? undefined,
          category_2nd: next.category_2nd,
          payment_method: next.payment_method,
          description: next.description,
          amount: next.amount ?? undefined,
          active: next.active,
        })
        if (!result.ok) toast.error(result.error)
      }
    })
  }

  const update = (patch: Partial<FixedExpenseRow>) => {
    const next = { ...draft, ...patch }
    setDraft(next)
    // active toggle / type 변경 / 카테고리 변경 / 결제수단 변경은 즉시 저장 시도
    if (
      patch.active !== undefined ||
      patch.type !== undefined ||
      patch.category_1st !== undefined ||
      patch.category_2nd !== undefined ||
      patch.payment_method !== undefined
    ) {
      persist(next)
    }
  }

  const onBlurField = () => {
    persist(draft)
  }

  const onConfirmDelete = () =>
    new Promise<void>((resolve) => {
      if (isNew) {
        onRemove(draft.id)
        resolve()
        return
      }
      startTransition(async () => {
        const result = await deleteFixedExpense({ id: draft.id })
        if (!result.ok) toast.error(result.error)
        resolve()
      })
    })

  return (
    <div
      className={cn(
        "grid grid-cols-[70px_60px_80px_1fr_1fr_120px_1fr_120px_40px] items-center gap-2 border-b border-neutral-100 px-3 py-2 text-sm",
        !draft.active && "opacity-50"
      )}
    >
      <button
        type="button"
        onClick={() => update({ active: !draft.active })}
        disabled={pending}
        className={cn(
          "rounded-full px-2 py-1 text-xs font-medium transition-colors",
          draft.active
            ? "bg-emerald-500 text-white hover:bg-emerald-600"
            : "bg-neutral-200 text-neutral-600 hover:bg-neutral-300"
        )}
        aria-label={draft.active ? "활성" : "비활성"}
      >
        {draft.active ? "✓ 활성" : "비활성"}
      </button>

      <input
        type="number"
        min={1}
        max={31}
        value={draft.day_of_month ?? ""}
        onChange={(e) =>
          setDraft({
            ...draft,
            day_of_month: e.target.value ? Number(e.target.value) : null,
          })
        }
        onBlur={onBlurField}
        disabled={pending}
        className="w-full rounded border border-neutral-300 px-2 py-1"
        placeholder="일"
      />

      <Select
        value={draft.type}
        onValueChange={(v) =>
          update({
            type: v as "income" | "expense",
            category_1st: null,
            category_2nd: null,
          })
        }
        disabled={pending}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="expense">출금</SelectItem>
          <SelectItem value="income">수입</SelectItem>
        </SelectContent>
      </Select>

      <CategoryDropdowns
        categories={categories}
        type={draft.type}
        value1st={draft.category_1st}
        value2nd={draft.category_2nd}
        onChange={(next) =>
          update({
            ...(next.category_1st !== undefined
              ? { category_1st: next.category_1st }
              : {}),
            ...(next.category_2nd !== undefined
              ? { category_2nd: next.category_2nd }
              : {}),
          })
        }
        disabled={pending}
      />
      {/* CategoryDropdowns가 fragment로 2 grid cell (1차 + 2차) 채움 */}

      <Select
        value={draft.payment_method ?? ""}
        onValueChange={(v) => update({ payment_method: v || null })}
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
        onChange={(e) =>
          setDraft({ ...draft, description: e.target.value || null })
        }
        onBlur={onBlurField}
        disabled={pending}
        className="w-full rounded border border-neutral-300 px-2 py-1"
        placeholder="설명"
      />

      <input
        type="text"
        inputMode="numeric"
        value={draft.amount ? draft.amount.toLocaleString("ko-KR") : ""}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "")
          setDraft({
            ...draft,
            amount: digits ? Number(digits) : null,
          })
        }}
        onBlur={onBlurField}
        disabled={pending}
        className="w-full rounded border border-neutral-300 px-2 py-1 text-right tabular-nums"
        placeholder="금액"
      />

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
        title="고정지출 삭제"
        message="이 고정지출을 삭제합니다. 이미 생성된 거래는 영향 없음."
        onConfirm={onConfirmDelete}
      />
    </div>
  )
}

function allRequiredFilled(r: FixedExpenseRow): boolean {
  return (
    r.day_of_month !== null &&
    r.day_of_month >= 0 &&
    r.day_of_month <= 31 &&
    !!r.category_1st &&
    r.amount !== null &&
    r.amount >= 0
  )
}
