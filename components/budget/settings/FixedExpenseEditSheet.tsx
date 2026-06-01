"use client"

import { useState, useTransition, useEffect } from "react"
import { Drawer } from "vaul"
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
import type { FixedExpenseRow } from "@/components/budget/settings/FixedExpenseRow"

type Mode = "add" | "edit"

type DraftState = {
  type: "income" | "expense"
  category_1st: string | null
  category_2nd: string | null
  day_of_month: number | null
  payment_method: string | null
  description: string | null
  amount: number | null
  active: boolean
}

function initialDraftFromRow(row: FixedExpenseRow): DraftState {
  return {
    type: row.type,
    category_1st: row.category_1st,
    category_2nd: row.category_2nd,
    day_of_month: row.day_of_month,
    payment_method: row.payment_method,
    description: row.description,
    amount: row.amount,
    active: row.active,
  }
}

function emptyDraft(): DraftState {
  return {
    type: "expense",
    category_1st: null,
    category_2nd: null,
    day_of_month: null,
    payment_method: null,
    description: null,
    amount: null,
    active: true,
  }
}

export function FixedExpenseEditSheet({
  open,
  mode,
  initial,
  categories,
  paymentMethods,
  onClose,
}: {
  open: boolean
  mode: Mode
  initial: FixedExpenseRow | null
  categories: CategoryOption[]
  paymentMethods: { id: string; name: string }[]
  onClose: () => void
}) {
  const [draft, setDraft] = useState<DraftState>(
    initial ? initialDraftFromRow(initial) : emptyDraft()
  )
  const [askDelete, setAskDelete] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (open) {
      setDraft(initial ? initialDraftFromRow(initial) : emptyDraft())
    }
  }, [open, initial])

  const save = () => {
    if (!draft.category_1st) {
      toast.error("1차 카테고리 필수")
      return
    }
    if (draft.day_of_month === null || draft.day_of_month < 0 || draft.day_of_month > 31) {
      toast.error("일은 0~31")
      return
    }
    if (draft.amount === null || draft.amount < 0) {
      toast.error("금액은 0 이상")
      return
    }

    startTransition(async () => {
      if (mode === "add") {
        const result = await addFixedExpense({
          day_of_month: draft.day_of_month!,
          type: draft.type,
          category_1st: draft.category_1st!,
          category_2nd: draft.category_2nd,
          payment_method: draft.payment_method,
          description: draft.description,
          amount: draft.amount!,
        })
        if (!result.ok) {
          toast.error(result.error)
          return
        }
        toast.success("추가됨")
        onClose()
      } else {
        if (!initial || initial.id.startsWith("temp-")) return
        const result = await updateFixedExpense({
          id: initial.id,
          day_of_month: draft.day_of_month!,
          type: draft.type,
          category_1st: draft.category_1st!,
          category_2nd: draft.category_2nd,
          payment_method: draft.payment_method,
          description: draft.description,
          amount: draft.amount!,
          active: draft.active,
        })
        if (!result.ok) {
          toast.error(result.error)
          return
        }
        toast.success("저장됨")
        onClose()
      }
    })
  }

  const onConfirmDelete = () =>
    new Promise<void>((resolve) => {
      if (!initial || initial.id.startsWith("temp-")) {
        resolve()
        return
      }
      startTransition(async () => {
        const result = await deleteFixedExpense({ id: initial.id })
        if (!result.ok) toast.error(result.error)
        else {
          toast.success("삭제됨")
          onClose()
        }
        resolve()
      })
    })

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(o) => !o && onClose()}
      dismissible={!pending}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mx-auto flex max-h-[85vh] max-w-md flex-col rounded-t-xl border-t border-neutral-200 bg-white">
          <div className="mx-auto mt-2 h-1 w-12 shrink-0 rounded-full bg-neutral-300" />
          <Drawer.Title className="px-4 pt-3 text-base font-semibold">
            {mode === "add" ? "고정지출 추가" : "고정지출 편집"}
          </Drawer.Title>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            <div>
              <label className="mb-1 block text-xs text-neutral-500">종류</label>
              <Select
                value={draft.type}
                onValueChange={(v) =>
                  setDraft({
                    ...draft,
                    type: v as "income" | "expense",
                    category_1st: null,
                    category_2nd: null,
                  })
                }
              >
                <SelectTrigger className="h-11 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">출금</SelectItem>
                  <SelectItem value="income">수입</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <CategoryDropdowns
                categories={categories}
                type={draft.type}
                value1st={draft.category_1st}
                value2nd={draft.category_2nd}
                onChange={(next) =>
                  setDraft({
                    ...draft,
                    ...(next.category_1st !== undefined
                      ? { category_1st: next.category_1st }
                      : {}),
                    ...(next.category_2nd !== undefined
                      ? { category_2nd: next.category_2nd }
                      : {}),
                  })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-neutral-500">
                  일 (0=날짜 미정)
                </label>
                <input
                  type="number"
                  min={0}
                  max={31}
                  value={draft.day_of_month ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      day_of_month: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="h-11 w-full rounded border border-neutral-300 px-3 text-base"
                  placeholder="0-31"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-500">
                  결제수단
                </label>
                <Select
                  value={draft.payment_method ?? ""}
                  onValueChange={(v) =>
                    setDraft({ ...draft, payment_method: v || null })
                  }
                >
                  <SelectTrigger className="h-11 text-base">
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
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-neutral-500">비고</label>
              <input
                type="text"
                value={draft.description ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value || null })
                }
                className="h-11 w-full rounded border border-neutral-300 px-3 text-base"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-neutral-500">금액</label>
              <input
                type="text"
                inputMode="numeric"
                value={draft.amount != null ? draft.amount.toLocaleString("ko-KR") : ""}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "")
                  setDraft({
                    ...draft,
                    amount: digits ? Number(digits) : null,
                  })
                }}
                className="h-11 w-full rounded border border-neutral-300 px-3 text-right text-base tabular-nums"
                placeholder="0"
              />
            </div>

            <div className="flex items-center justify-between rounded border border-neutral-200 px-3 py-2">
              <label className="text-sm">활성</label>
              <button
                type="button"
                onClick={() => setDraft({ ...draft, active: !draft.active })}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  draft.active
                    ? "bg-emerald-500 text-white"
                    : "bg-neutral-200 text-neutral-600"
                )}
              >
                {draft.active ? "✓ 활성" : "비활성"}
              </button>
            </div>
          </div>

          <div className="flex shrink-0 gap-2 border-t border-neutral-100 px-4 py-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={pending}
              className="flex-1"
            >
              닫기
            </Button>
            {mode === "edit" && (
              <Button
                variant="destructive"
                onClick={() => setAskDelete(true)}
                disabled={pending}
              >
                삭제
              </Button>
            )}
            <Button onClick={save} disabled={pending} className="flex-1">
              {pending ? "..." : "저장"}
            </Button>
          </div>

          <DeleteConfirmDialog
            open={askDelete}
            onOpenChange={setAskDelete}
            title="고정지출 삭제"
            message="이 고정지출을 삭제합니다. 이미 생성된 거래는 영향 없음."
            onConfirm={onConfirmDelete}
          />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
