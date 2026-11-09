"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { UserMenu } from "@/components/common/UserMenu"

const NAV_ITEMS = [
  { label: "가계부", href: "/budget" },
  { label: "To Do", href: "/diary/notes" },
  { label: "일기장", href: "/diary" },
  { label: "운동기록", href: "/workout" },
] as const

export function GlobalHeader({ user }: { user: { email: string } | null }) {
  const pathname = usePathname()

  // 가장 구체적인(긴) href를 가진 항목만 활성화 — "/diary"와 "/diary/notes"처럼
  // 경로가 겹칠 때 두 메뉴가 동시에 활성화되는 것을 방지
  const activeHref = NAV_ITEMS.map((i) => i.href)
    .filter((href) => pathname === href || pathname.startsWith(href + "/"))
    .sort((a, b) => b.length - a.length)[0]

  return (
    <header className="border-b border-neutral-200">
      <nav className="mx-auto grid max-w-5xl grid-cols-[1fr_auto_1fr] items-center px-4 py-3">
        {/* 좌측 스페이서 (모바일 햄버거 자리 확보) */}
        <div />

        {/* 중앙 메뉴 */}
        <div className="flex items-center gap-3 md:gap-6">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === activeHref
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
        </div>

        {/* 우측 UserMenu */}
        <div className="flex justify-end">
          {user ? <UserMenu email={user.email} /> : null}
        </div>
      </nav>
    </header>
  )
}
