"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type CategoryOption = {
  id: string
  name: string
  type: "income" | "expense"
  parent_id: string | null
}

export function CategoryDropdowns({
  categories,
  type,
  value1st,
  value2nd,
  onChange,
  disabled,
}: {
  categories: CategoryOption[]
  type: "income" | "expense"
  value1st?: string | null
  value2nd?: string | null
  onChange: (next: { category_1st?: string | null; category_2nd?: string | null }) => void
  disabled?: boolean
}) {
  const primaries = categories.filter(
    (c) => c.type === type && c.parent_id === null
  )
  const selectedPrimary = primaries.find((p) => p.name === value1st)
  const secondaries = selectedPrimary
    ? categories.filter((c) => c.parent_id === selectedPrimary.id)
    : []

  // Fragment 반환 — 부모가 grid면 2 cell, standalone이면 부모가 wrap 책임
  return (
    <>
      <Select
        value={value1st ?? ""}
        onValueChange={(v) =>
          onChange({ category_1st: v || null, category_2nd: null })
        }
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="1차" />
        </SelectTrigger>
        <SelectContent>
          {primaries.map((p) => (
            <SelectItem key={p.id} value={p.name}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value2nd ?? ""}
        onValueChange={(v) => onChange({ category_2nd: v || null })}
        disabled={disabled || !selectedPrimary || secondaries.length === 0}
      >
        <SelectTrigger className="w-full">
          <SelectValue
            placeholder={
              !selectedPrimary
                ? "—"
                : secondaries.length === 0
                ? "(없음)"
                : "2차"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {secondaries.map((s) => (
            <SelectItem key={s.id} value={s.name}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )
}
