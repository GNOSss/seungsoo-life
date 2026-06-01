import { createClient } from "@/lib/supabase/server"
import { getCurrentDate, parseDate } from "@/lib/utils/diary-date"
import {
  DiarySidebarTree,
  type YearGroup,
  type MonthGroup,
} from "@/components/diary/sidebar/DiarySidebarTree"

export async function DiarySidebar() {
  const supabase = await createClient()

  const { data: rows, error } = await supabase
    .from("diary_days")
    .select("date")
    .order("date", { ascending: false })

  if (error) {
    return (
      <aside className="fixed left-0 top-0 z-50 h-screen w-56 border-r border-neutral-200 bg-white px-3 py-4 md:sticky">
        <p className="text-sm text-red-600">
          사이드바 로드 실패: {error.message}
        </p>
      </aside>
    )
  }

  const yearMap = new Map<number, Map<number, string[]>>()
  for (const r of rows ?? []) {
    const { year, month } = parseDate(r.date)
    let mm = yearMap.get(year)
    if (!mm) {
      mm = new Map()
      yearMap.set(year, mm)
    }
    const arr = mm.get(month) ?? []
    arr.push(r.date)
    mm.set(month, arr)
  }
  const yearGroups: YearGroup[] = Array.from(yearMap.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, monthsMap]) => ({
      year,
      months: Array.from(monthsMap.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([month, dates]): MonthGroup => ({ month, dates })),
    }))

  return (
    <DiarySidebarTree yearGroups={yearGroups} currentDate={getCurrentDate()} />
  )
}
