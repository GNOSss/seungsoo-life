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

  // RPC 사용: PostgREST 기본 max-rows(1000)에 안 걸리도록 DB 측에서 DISTINCT 주.
  const { data: rows, error } = await supabase.rpc("get_user_diary_mondays")

  if (error) {
    return (
      <aside className="fixed left-0 top-0 z-50 h-screen w-56 border-r border-neutral-200 bg-white px-3 py-4 md:sticky">
        <p className="text-sm text-red-600">
          사이드바 로드 실패: {error.message}
        </p>
      </aside>
    )
  }

  // year > month > [mondays] 그룹화. 월·주는 오름차순.
  const yearMap = new Map<number, Map<number, string[]>>()
  const mondayList = (rows ?? []).map((r: { monday: string }) => r.monday).sort()
  for (const monday of mondayList) {
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
    .sort((a, b) => a[0] - b[0]) // year 오름차순 (2026 → 2027)
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
