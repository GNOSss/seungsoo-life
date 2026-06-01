import { createClient } from "@/lib/supabase/server"
import { WorkoutSidebarTree, type YearGroup } from "./WorkoutSidebarTree"

type WorkoutDateRow = { date: string; label: string }

export async function WorkoutSidebar() {
  const supabase = await createClient()
  const { data: rows, error } = await supabase.rpc("get_user_workout_dates")
  if (error) {
    return (
      <aside className="fixed left-0 top-0 z-50 h-screen w-56 border-r border-neutral-200 bg-white p-4 md:sticky">
        <p className="text-sm text-red-600">사이드바 로드 실패: {error.message}</p>
      </aside>
    )
  }

  // year > month > [{date, label}] 그룹화 (오름차순)
  const yearMap = new Map<number, Map<number, WorkoutDateRow[]>>()
  for (const r of (rows ?? []) as WorkoutDateRow[]) {
    const d = new Date(`${r.date}T00:00:00Z`)
    const y = d.getUTCFullYear()
    const m = d.getUTCMonth() + 1
    if (!yearMap.has(y)) yearMap.set(y, new Map())
    const mm = yearMap.get(y)!
    if (!mm.has(m)) mm.set(m, [])
    mm.get(m)!.push(r)
  }
  const yearGroups: YearGroup[] = Array.from(yearMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, monthsMap]) => ({
      year,
      months: Array.from(monthsMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([month, dates]) => ({ month, dates: dates.sort((a, b) => a.date.localeCompare(b.date)) })),
    }))

  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth() + 1

  return (
    <WorkoutSidebarTree
      yearGroups={yearGroups}
      currentYear={currentYear}
      currentMonth={currentMonth}
    />
  )
}
