import { createClient } from "@/lib/supabase/server"
import {
  getCurrentDate,
  getMondayOf,
  parseDate,
} from "@/lib/utils/diary-date"
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

  // diary_days의 date들을 그 주의 월요일로 변환, 중복 제거
  const mondaySet = new Set<string>()
  for (const r of rows ?? []) {
    mondaySet.add(getMondayOf(r.date))
  }
  // year > month(=월요일의 월) > [mondays] 그룹화. 월·주는 오름차순.
  const yearMap = new Map<number, Map<number, string[]>>()
  for (const monday of Array.from(mondaySet).sort()) {
    const { year, month } = parseDate(monday)
    let mm = yearMap.get(year)
    if (!mm) {
      mm = new Map()
      yearMap.set(year, mm)
    }
    const arr = mm.get(month) ?? []
    arr.push(monday)
    mm.set(month, arr)
  }
  const yearGroups: YearGroup[] = Array.from(yearMap.entries())
    .sort((a, b) => b[0] - a[0]) // year 내림차순 유지 (최근 연도 위)
    .map(([year, monthsMap]) => ({
      year,
      months: Array.from(monthsMap.entries())
        .sort((a, b) => a[0] - b[0]) // 월 오름차순 (1월, 2월, ...)
        .map(([month, mondays]): MonthGroup => ({ month, mondays })),
    }))

  return (
    <DiarySidebarTree
      yearGroups={yearGroups}
      currentMonday={getMondayOf(getCurrentDate())}
    />
  )
}
