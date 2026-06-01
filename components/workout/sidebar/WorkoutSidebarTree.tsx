"use client"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export type DateRow = { date: string; label: string }
export type MonthGroup = { month: number; dates: DateRow[] }
export type YearGroup = { year: number; months: MonthGroup[] }

const TOP_LINKS = [
  { href: "/workout/start", label: "🏠 시작" },
  { href: "/workout/exercises", label: "🏋️ 운동 종목" },
  { href: "/workout/templates", label: "📋 템플릿" },
] as const

export function WorkoutSidebarTree({
  yearGroups,
  currentYear,
  currentMonth,
}: {
  yearGroups: YearGroup[]
  currentYear: number
  currentMonth: number
}) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>(() => ({ [currentYear]: true }))
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>(() => ({ [`${currentYear}-${currentMonth}`]: true }))

  const toggleYear = (y: number) => setExpandedYears((p) => ({ ...p, [y]: !p[y] }))
  const toggleMonth = (y: number, m: number) => setExpandedMonths((p) => {
    const k = `${y}-${m}`
    return { ...p, [k]: !p[k] }
  })

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-3 z-40 md:hidden"
        aria-label="사이드바 열기"
      >☰</button>
      {mobileOpen ? (
        <div onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-black/40 md:hidden" />
      ) : null}
      <aside className={cn(
        "fixed left-0 top-0 z-50 h-screen w-56 border-r border-neutral-200 bg-white px-3 py-4 transition-transform md:sticky md:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="flex h-full flex-col overflow-y-auto">
          <ul className="mb-4 space-y-0.5">
            {TOP_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "block rounded px-2 py-1 text-sm",
                    pathname === l.href ? "bg-neutral-100 font-semibold" : "text-neutral-600 hover:bg-neutral-50"
                  )}
                >{l.label}</Link>
              </li>
            ))}
          </ul>
          <h2 className="mb-2 px-2 text-xs font-semibold text-neutral-500">📔 워크아웃 이력</h2>
          {yearGroups.length === 0 ? (
            <p className="px-2 text-xs text-neutral-400">아직 운동 기록 없음</p>
          ) : (
            <ul className="space-y-1">
              {yearGroups.map((yg) => (
                <li key={yg.year}>
                  <button
                    onClick={() => toggleYear(yg.year)}
                    className="flex w-full items-center gap-1 rounded px-2 py-1 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    <span className="text-neutral-400">{expandedYears[yg.year] ? "▼" : "▶"}</span>
                    {yg.year}년
                  </button>
                  {expandedYears[yg.year] && (
                    <ul className="ml-3 mt-1 space-y-0.5">
                      {yg.months.map((mg) => {
                        const mKey = `${yg.year}-${mg.month}`
                        return (
                          <li key={mKey}>
                            <button
                              onClick={() => toggleMonth(yg.year, mg.month)}
                              className="flex w-full items-center gap-1 rounded px-2 py-0.5 text-xs text-neutral-600 hover:bg-neutral-50"
                            >
                              <span className="text-neutral-400">{expandedMonths[mKey] ? "▼" : "▶"}</span>
                              {mg.month}월
                            </button>
                            {expandedMonths[mKey] && (
                              <ul className="ml-3 space-y-0">
                                {mg.dates.map((d) => (
                                  <li key={d.date}>
                                    <Link
                                      href={`/workout/history/${d.date}/`}
                                      onClick={() => setMobileOpen(false)}
                                      className="block rounded px-2 py-0.5 text-[11px] text-neutral-600 hover:bg-neutral-50"
                                    >
                                      {d.date.slice(5)} — {d.label}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  )
}
