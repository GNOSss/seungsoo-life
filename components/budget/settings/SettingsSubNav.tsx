"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const TABS = [
  { label: "카테고리", href: "/budget/settings/categories" },
  { label: "결제수단", href: "/budget/settings/payment-methods" },
  { label: "고정지출", href: "/budget/settings/fixed-expenses" },
] as const

export function SettingsSubNav() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-6 border-b border-neutral-200">
      {TABS.map((tab) => {
        const isActive = pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "border-b-2 px-1 py-3 text-sm transition-colors",
              isActive
                ? "border-neutral-900 font-semibold text-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-900"
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
