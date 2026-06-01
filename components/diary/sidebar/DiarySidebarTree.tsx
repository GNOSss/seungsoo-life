"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { WeekLink } from "@/components/diary/sidebar/WeekLink"
import { parseDate } from "@/lib/utils/diary-date"

export type MonthGroup = { month: number; mondays: string[] }
export type YearGroup = { year: number; months: MonthGroup[] }

const SETTINGS_LINKS = [
  { href: "/diary/settings/activities", label: "활동 라이브러리" },
  { href: "/diary/settings/quests", label: "Daily Quest" },
] as const

export function DiarySidebarTree({
  yearGroups,
  currentMonday,
}: {
  yearGroups: YearGroup[]
  currentMonday: string
}) {
  const { year: currentYear, month: currentMonth } = parseDate(currentMonday)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>(
    () => ({ [currentYear]: true })
  )
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>(
    () => ({ [`${currentYear}-${currentMonth}`]: true })
  )
  const pathname = usePathname()

  const toggleYear = (year: number) => {
    setExpandedYears((prev) => ({ ...prev, [year]: !prev[year] }))
  }
  const toggleMonth = (year: number, month: number) => {
    const key = `${year}-${month}`
    setExpandedMonths((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-3 z-40 md:hidden"
        aria-label="사이드바 열기"
      >
        ☰
      </button>

      {mobileOpen ? (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      ) : null}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-56 border-r border-neutral-200 bg-white px-3 py-4 transition-transform md:sticky md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col overflow-y-auto">
          <div className="mb-6">
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

          <div className="mb-4">
            <h2 className="mb-2 px-2 text-xs font-semibold text-neutral-500">
              📔 일기 (주간)
            </h2>
            {yearGroups.length === 0 ? (
              <p className="px-2 text-xs text-neutral-400">아직 입력 없음</p>
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
                      <ul className="ml-3 mt-1 space-y-0.5">
                        {group.months.map((mg) => {
                          const mKey = `${group.year}-${mg.month}`
                          return (
                            <li key={mKey}>
                              <button
                                type="button"
                                onClick={() => toggleMonth(group.year, mg.month)}
                                className="flex w-full items-center gap-1 rounded px-2 py-0.5 text-xs text-neutral-600 hover:bg-neutral-50"
                              >
                                <span className="text-neutral-400">
                                  {expandedMonths[mKey] ? "▼" : "▶"}
                                </span>
                                {mg.month}월
                              </button>
                              {expandedMonths[mKey] ? (
                                <ul className="ml-3 space-y-0">
                                  {mg.mondays.map((monday) => (
                                    <li key={monday}>
                                      <WeekLink
                                        monday={monday}
                                        isCurrent={monday === currentMonday}
                                      />
                                    </li>
                                  ))}
                                </ul>
                              ) : null}
                            </li>
                          )
                        })}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
