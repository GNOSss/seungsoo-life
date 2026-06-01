"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { formatWeekRange } from "@/lib/utils/diary-date"

export function WeekLink({
  monday,
  isCurrent,
}: {
  monday: string
  isCurrent: boolean
}) {
  const pathname = usePathname()
  const isActive = pathname === `/diary/week/${monday}`
  return (
    <Link
      href={`/diary/week/${monday}`}
      className={cn(
        "block rounded px-2 py-0.5 text-xs transition-colors",
        isActive
          ? "bg-neutral-100 font-bold text-neutral-900"
          : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
      )}
    >
      {isCurrent ? "⭐ " : "ㆍ "}
      {formatWeekRange(monday)}
    </Link>
  )
}
