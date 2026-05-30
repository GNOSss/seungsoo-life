import { createClient } from "@/lib/supabase/server"
import { getCurrentYm, getNextYm, parseYm } from "@/lib/utils/ym"
import {
  SidebarTree,
  type YearGroup,
} from "@/components/budget/sidebar/SidebarTree"

export async function Sidebar() {
  const supabase = await createClient()

  const [
    { data: summaries, error: sumErr },
    { data: txYms, error: txErr },
  ] = await Promise.all([
    supabase
      .from("monthly_summaries")
      .select("year_month")
      .order("year_month", { ascending: false }),
    supabase
      .from("transactions")
      .select("year_month")
      .order("year_month", { ascending: false }),
  ])

  if (sumErr || txErr) {
    return (
      <aside className="fixed left-0 top-0 z-50 h-screen w-56 border-r border-neutral-200 bg-white px-3 py-4 md:sticky">
        <p className="text-sm text-red-600">
          사이드바 로드 실패: {sumErr?.message ?? txErr?.message}
        </p>
      </aside>
    )
  }

  // 두 집합 합집합 → 중복 제거 → 내림차순 정렬
  const ymSet = new Set<string>()
  for (const r of summaries ?? []) ymSet.add(r.year_month)
  for (const r of txYms ?? []) ymSet.add(r.year_month)
  const sortedYms = Array.from(ymSet).sort().reverse() // 내림차순

  // year별 그룹화 (year 내림차순, month 내림차순)
  const groupsMap = new Map<number, string[]>()
  for (const ym of sortedYms) {
    const { year } = parseYm(ym)
    const arr = groupsMap.get(year) ?? []
    arr.push(ym)
    groupsMap.set(year, arr)
  }
  const yearGroups: YearGroup[] = Array.from(groupsMap.entries())
    .sort((a, b) => b[0] - a[0]) // year 내림차순
    .map(([year, months]) => ({ year, months }))

  // createTarget 계산
  const currentYm = getCurrentYm()
  const latestYm = sortedYms[0] ?? null
  let createTarget: string | null = null
  if (!latestYm) {
    // 첫 사용자 — 아무 월도 없음
    createTarget = currentYm
  } else {
    const nextAfterLatest = getNextYm(latestYm)
    createTarget = ymSet.has(nextAfterLatest) ? null : nextAfterLatest
  }

  return (
    <SidebarTree
      yearGroups={yearGroups}
      currentYm={currentYm}
      createTarget={createTarget}
    />
  )
}
