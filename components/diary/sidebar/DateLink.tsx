"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { parseDate } from "@/lib/utils/diary-date"
import { DeleteConfirmDialog } from "@/components/budget/settings/DeleteConfirmDialog"
import { deleteDiaryDate } from "@/lib/actions/diary-days"
import { toast } from "sonner"

export function DateLink({
  date,
  isCurrent,
}: {
  date: string
  isCurrent: boolean
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [askDelete, setAskDelete] = useState(false)
  const [, startTransition] = useTransition()
  const isActive = pathname === `/diary/${date}`
  const { day } = parseDate(date)

  const onConfirmDelete = () =>
    new Promise<void>((resolve) => {
      startTransition(async () => {
        const result = await deleteDiaryDate({ date })
        if (!result.ok) {
          toast.error(result.error)
          resolve()
          return
        }
        toast.success(`${day}일 삭제됨`)
        if (isActive) router.push("/diary")
        resolve()
      })
    })

  return (
    <>
      <div className="group flex items-center gap-0.5">
        <Link
          href={`/diary/${date}`}
          className={cn(
            "flex-1 rounded px-2 py-0.5 text-xs transition-colors",
            isActive
              ? "bg-neutral-100 font-bold text-neutral-900"
              : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
          )}
        >
          {isCurrent ? "⭐ " : "ㆍ "}
          {day}일
        </Link>
        <button
          type="button"
          onClick={() => setAskDelete(true)}
          aria-label={`${day}일 삭제`}
          className="shrink-0 rounded px-1 py-0.5 text-xs text-neutral-300 transition-colors hover:bg-red-50 hover:text-red-500"
        >
          ✕
        </button>
      </div>

      <DeleteConfirmDialog
        open={askDelete}
        onOpenChange={setAskDelete}
        title={`${day}일 삭제`}
        message={`이 날의 모든 시간 로그와 Quest 체크가 삭제됩니다.\n되돌릴 수 없습니다.`}
        onConfirm={onConfirmDelete}
      />
    </>
  )
}
