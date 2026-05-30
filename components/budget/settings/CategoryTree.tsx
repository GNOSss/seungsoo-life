"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { CategoryRowForm } from "@/components/budget/settings/CategoryRowForm"
import { DeleteConfirmDialog } from "@/components/budget/settings/DeleteConfirmDialog"
import { deleteCategory } from "@/lib/actions/categories"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type Category = {
  id: string
  name: string
  type: "income" | "expense"
  parent_id: string | null
  sort_order: number
}

export function CategoryTree({ categories }: { categories: Category[] }) {
  const groups: Record<"expense" | "income", Category[]> = {
    expense: categories.filter((c) => c.type === "expense"),
    income: categories.filter((c) => c.type === "income"),
  }

  return (
    <div className="space-y-10">
      <CategoryGroup
        title="💸 지출 카테고리"
        type="expense"
        items={groups.expense}
      />
      <CategoryGroup
        title="💰 수입 카테고리"
        type="income"
        items={groups.income}
      />
    </div>
  )
}

function CategoryGroup({
  title,
  type,
  items,
}: {
  title: string
  type: "income" | "expense"
  items: Category[]
}) {
  const [adding, setAdding] = useState(false)
  const top = items.filter((c) => c.parent_id === null)

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Button size="sm" onClick={() => setAdding(true)}>
          + 1차 카테고리 추가
        </Button>
      </div>
      <div className="divide-y divide-neutral-100 rounded border border-neutral-200">
        {top.map((primary) => (
          <PrimaryNode
            key={primary.id}
            primary={primary}
            secondaries={items.filter((c) => c.parent_id === primary.id)}
          />
        ))}
        {adding ? (
          <div className="px-3 py-1">
            <CategoryRowForm
              type={type}
              parentId={null}
              onCancel={() => setAdding(false)}
            />
          </div>
        ) : null}
        {top.length === 0 && !adding ? (
          <p className="px-3 py-4 text-sm text-neutral-500">
            아직 카테고리가 없습니다. &quot;+ 1차 카테고리 추가&quot;로 시작하세요.
          </p>
        ) : null}
      </div>
    </section>
  )
}

function PrimaryNode({
  primary,
  secondaries,
}: {
  primary: Category
  secondaries: Category[]
}) {
  const [expanded, setExpanded] = useState(false)
  const [addingChild, setAddingChild] = useState(false)
  const [askDelete, setAskDelete] = useState(false)
  const [, startTransition] = useTransition()

  const onConfirmDelete = () =>
    new Promise<void>((resolve) => {
      startTransition(async () => {
        const result = await deleteCategory({ id: primary.id })
        if (!result.ok) toast.error(result.error)
        resolve()
      })
    })

  return (
    <div className={cn("px-3 py-1", expanded && "bg-neutral-50")}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-neutral-400 hover:text-neutral-700"
          aria-label={expanded ? "접기" : "펼치기"}
        >
          {expanded ? "▼" : "▶"}
        </button>
        <div className="flex-1">
          <CategoryRowForm
            category={{ id: primary.id, name: primary.name }}
            type={primary.type}
            parentId={null}
            onAskDelete={() => setAskDelete(true)}
          />
        </div>
        {!expanded && secondaries.length > 0 ? (
          <span className="text-xs text-neutral-400">({secondaries.length})</span>
        ) : null}
      </div>

      {expanded ? (
        <div className="ml-7 mt-1 space-y-1 border-l border-neutral-200 pl-3">
          {secondaries.map((sec) => (
            <SecondaryNode key={sec.id} secondary={sec} parent={primary} />
          ))}
          {addingChild ? (
            <CategoryRowForm
              type={primary.type}
              parentId={primary.id}
              onCancel={() => setAddingChild(false)}
            />
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAddingChild(true)}
              className="text-xs"
            >
              + 하위 카테고리 추가
            </Button>
          )}
        </div>
      ) : null}

      <DeleteConfirmDialog
        open={askDelete}
        onOpenChange={setAskDelete}
        title={`"${primary.name}" 삭제`}
        message={`하위 카테고리 ${secondaries.length}개도 함께 삭제됩니다.\n과거 거래의 텍스트는 그대로 유지됩니다. (스냅샷 패턴)`}
        onConfirm={onConfirmDelete}
      />
    </div>
  )
}

function SecondaryNode({
  secondary,
  parent,
}: {
  secondary: Category
  parent: Category
}) {
  const [askDelete, setAskDelete] = useState(false)
  const [, startTransition] = useTransition()

  const onConfirmDelete = () =>
    new Promise<void>((resolve) => {
      startTransition(async () => {
        const result = await deleteCategory({ id: secondary.id })
        if (!result.ok) toast.error(result.error)
        resolve()
      })
    })

  return (
    <div>
      <CategoryRowForm
        category={{ id: secondary.id, name: secondary.name }}
        type={secondary.type}
        parentId={parent.id}
        onAskDelete={() => setAskDelete(true)}
      />
      <DeleteConfirmDialog
        open={askDelete}
        onOpenChange={setAskDelete}
        title={`"${secondary.name}" 삭제`}
        message="과거 거래의 텍스트는 그대로 유지됩니다. (스냅샷 패턴)"
        onConfirm={onConfirmDelete}
      />
    </div>
  )
}
