"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { parseYm } from "@/lib/utils/ym"

export function MonthLink({
  ym,
  isCurrent,
}: {
  ym: string
  isCurrent: boolean
}) {
  const pathname = usePathname()
  const isActive = pathname === `/budget/${ym}`
  const { month } = parseYm(ym)

  return (
    <Link
      href={`/budget/${ym}`}
      className={cn(
        "block rounded px-2 py-1 text-sm transition-colors",
        isActive
          ? "bg-neutral-100 font-bold text-neutral-900"
          : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
      )}
    >
      {isCurrent ? "⭐ " : "ㆍ "}
      {month}월
    </Link>
  )
}
