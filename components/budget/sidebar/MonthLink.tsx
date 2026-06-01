"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { parseYm } from "@/lib/utils/ym"
import { DeleteConfirmDialog } from "@/components/budget/settings/DeleteConfirmDialog"
import { deleteMonth } from "@/lib/actions/budget-months"
import { toast } from "sonner"

export function MonthLink({
  ym,
  isCurrent,
}: {
  ym: string
  isCurrent: boolean
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [askDelete, setAskDelete] = useState(false)
  const [, startTransition] = useTransition()
  const isActive = pathname === `/budget/${ym}`
  const { month } = parseYm(ym)

  const onConfirmDelete = () =>
    new Promise<void>((resolve) => {
      startTransition(async () => {
        const result = await deleteMonth({ ym })
        if (!result.ok) {
          toast.error(result.error)
          resolve()
          return
        }
        toast.success(`${month}월 삭제됨`)
        if (isActive) router.push("/budget")
        resolve()
      })
    })

  return (
    <>
      <div className="group flex items-center gap-0.5">
        <Link
          href={`/budget/${ym}`}
          className={cn(
            "flex-1 rounded px-2 py-1 text-sm transition-colors",
            isActive
              ? "bg-neutral-100 font-bold text-neutral-900"
              : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
          )}
        >
          {isCurrent ? "⭐ " : "ㆍ "}
          {month}월
        </Link>
        <button
          type="button"
          onClick={() => setAskDelete(true)}
          aria-label={`${month}월 삭제`}
          className="shrink-0 rounded px-1.5 py-1 text-xs text-neutral-300 transition-colors hover:bg-red-50 hover:text-red-500"
        >
          ✕
        </button>
      </div>

      <DeleteConfirmDialog
        open={askDelete}
        onOpenChange={setAskDelete}
        title={`${month}월 삭제`}
        message={`${month}월의 모든 거래와 요약이 삭제됩니다.\n이후 월의 잔고는 자동 갱신됩니다.\n되돌릴 수 없습니다.`}
        onConfirm={onConfirmDelete}
      />
    </>
  )
}
