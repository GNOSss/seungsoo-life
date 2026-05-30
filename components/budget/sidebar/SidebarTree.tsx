"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { MonthLink } from "@/components/budget/sidebar/MonthLink"
import { CreateMonthButton } from "@/components/budget/sidebar/CreateMonthButton"
import { parseYm } from "@/lib/utils/ym"

export type YearGroup = {
  year: number
  months: string[] // ym 배열, 내림차순
}

const SETTINGS_LINKS = [
  { href: "/budget/settings/categories", label: "카테고리" },
  { href: "/budget/settings/payment-methods", label: "결제수단" },
  { href: "/budget/settings/fixed-expenses", label: "고정지출" },
] as const

export function SidebarTree({
  yearGroups,
  currentYm,
  createTarget,
}: {
  yearGroups: YearGroup[]
  currentYm: string
  createTarget: string | null
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>(
    () => {
      const init: Record<number, boolean> = {}
      if (yearGroups.length > 0) init[yearGroups[0].year] = true
      return init
    }
  )
  const pathname = usePathname()

  const toggleYear = (year: number) => {
    setExpandedYears((prev) => ({ ...prev, [year]: !prev[year] }))
  }

  return (
    <>
      {/* 모바일 햄버거 (md 이상에선 숨김) */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-3 z-40 md:hidden"
        aria-label="사이드바 열기"
      >
        ☰
      </button>

      {/* 모바일 dim overlay */}
      {mobileOpen ? (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      ) : null}

      {/* 사이드바 본체 */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-56 border-r border-neutral-200 bg-white px-3 py-4 transition-transform md:sticky md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col overflow-y-auto">
          {/* 일지 트리 */}
          <div className="mb-6">
            <h2 className="mb-2 px-2 text-xs font-semibold text-neutral-500">
              📒 일지
            </h2>
            {yearGroups.length === 0 ? (
              <p className="px-2 text-xs text-neutral-400">아직 월 없음</p>
            ) : (
              <ul className="space-y-1">
                {yearGroups.map((group) => (
                  <li key={group.year}>
                    <button
                      type="button"
                      onClick={() => toggleYear(group.year)}
                      className="flex w-full items-center gap-1 rounded px-2 py-1 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                    >
                      <span className="text-neutral-400">
                        {expandedYears[group.year] ? "▼" : "▶"}
                      </span>
                      {group.year}년
                    </button>
                    {expandedYears[group.year] ? (
                      <ul className="ml-4 mt-1 space-y-0.5">
                        {group.months.map((ym) => (
                          <li key={ym}>
                            <MonthLink ym={ym} isCurrent={ym === currentYm} />
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* + 생성 버튼 */}
          {createTarget ? (
            <div className="mb-6 px-2">
              <CreateMonthButton
                ym={createTarget}
                label={`+ ${parseYm(createTarget).month}월 생성`}
                variant="sidebar"
              />
            </div>
          ) : null}

          {/* 설정 메뉴 */}
          <div className="mt-auto">
            <h2 className="mb-2 px-2 text-xs font-semibold text-neutral-500">
              ⚙️ 설정
            </h2>
            <ul className="space-y-0.5">
              {SETTINGS_LINKS.map((link) => {
                const isActive = pathname.startsWith(link.href)
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "block rounded px-2 py-1 text-sm transition-colors",
                        isActive
                          ? "bg-neutral-100 font-bold text-neutral-900"
                          : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                      )}
                    >
                      ㆍ {link.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </aside>
    </>
  )
}
