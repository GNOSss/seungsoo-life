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
import { addTransaction } from "@/lib/actions/transactions"
import { toast } from "sonner"
import { ymWithDay } from "@/lib/utils/ym"

type Draft = {
  category_1st: string | null
  category_2nd: string | null
  day: number | null
  payment_method: string | null
  description: string | null
  amount: number | null
  is_paid: boolean
}

const EMPTY_DRAFT: Draft = {
  category_1st: null,
  category_2nd: null,
  day: null,
  payment_method: null,
  description: null,
  amount: null,
  is_paid: false,
}

export function TransactionAddRow({
  type,
  categories,
  paymentMethods,
  ym,
}: {
  type: "income" | "expense"
  categories: CategoryOption[]
  paymentMethods: { id: string; name: string }[]
  ym: string
}) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [pending, startTransition] = useTransition()

  const allRequiredFilled =
    !!draft.category_1st &&
    draft.day !== null &&
    draft.day >= 1 &&
    draft.day <= 31 &&
    draft.amount !== null &&
    draft.amount > 0

  const save = () => {
    if (!allRequiredFilled) {
      toast.error("1차 카테고리/날짜/금액은 필수")
      return
    }
    startTransition(async () => {
      const result = await addTransaction({
        year_month: ym,
        date: ymWithDay(ym, draft.day!),
        type,
        category_1st: draft.category_1st!,
        category_2nd: draft.category_2nd ?? null,
        payment_method: draft.payment_method ?? null,
        description: draft.description ?? null,
        amount: draft.amount!,
        is_paid: draft.is_paid,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setDraft(EMPTY_DRAFT)
      setAdding(false)
    })
  }

  const onChangePaymentMethod = (v: string | null) => {
    setDraft({ ...draft, payment_method: v || null })
  }

  if (!adding) {
    return (
      <div className="border-t border-neutral-200 p-2">
        <Button size="sm" onClick={() => setAdding(true)}>
          + 새 행
        </Button>
      </div>
    )
  }

  return (
    <div className="border-t border-neutral-200 p-2">
      <div className="grid grid-cols-[1fr_1fr_45px_100px_1fr_120px_70px_30px] items-center gap-1 text-sm">
        <CategoryDropdowns
          categories={categories}
          type={type}
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
          disabled={pending}
        />

        <input
          type="number"
          min={1}
          max={31}
          value={draft.day ?? ""}
          onChange={(e) =>
            setDraft({ ...draft, day: e.target.value ? Number(e.target.value) : null })
          }
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
          onChange={(e) =>
            setDraft({ ...draft, description: e.target.value || null })
          }
          disabled={pending}
          className="w-full rounded border border-neutral-300 px-1 py-0.5"
          placeholder="비고"
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
          onKeyDown={(e) => {
            if (e.key === "Enter") save()
          }}
          disabled={pending}
          className="w-full rounded border border-neutral-300 px-1 py-0.5 text-right tabular-nums"
          placeholder="금액"
        />

        <div className="flex items-center justify-center rounded bg-neutral-100/60 py-1">
          <Switch
            checked={draft.is_paid}
            onCheckedChange={(v) => setDraft({ ...draft, is_paid: v })}
            disabled={pending}
          />
        </div>

        <span />
      </div>

      <div className="mt-2 flex gap-2">
        <Button size="sm" onClick={save} disabled={pending}>
          {pending ? "저장 중..." : "추가"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setDraft(EMPTY_DRAFT)
            setAdding(false)
          }}
          disabled={pending}
        >
          취소
        </Button>
      </div>
    </div>
  )
}
