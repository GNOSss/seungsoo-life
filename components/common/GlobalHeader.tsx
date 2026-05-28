"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { label: "가계부", href: "/budget" },
  { label: "일기장", href: "/diary" },
  { label: "운동기록", href: "/workout" },
] as const

export function GlobalHeader() {
  const pathname = usePathname()

  return (
    <header className="border-b border-neutral-200">
      <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm transition-colors",
                isActive
                  ? "font-bold underline underline-offset-4"
                  : "text-neutral-600 hover:text-neutral-900"
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
