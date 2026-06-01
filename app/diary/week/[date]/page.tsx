import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import {
  isValidDate,
  getMondayOf,
  getWeekDays,
  getNextMonday,
  getPrevMonday,
  getCurrentDate,
  formatWeekRange,
} from "@/lib/utils/diary-date"
import { WeekTimelineGrid } from "@/components/diary/week/WeekTimelineGrid"
import { WeekQuestGrid, type WeekCheckMap } from "@/components/diary/week/WeekQuestGrid"
import { WeekDayCardList } from "@/components/diary/week/WeekDayCardList"
import { type TimelineEntry } from "@/components/diary/day/Timeline"

export default async function DiaryWeekPage({
  params,
}: {
  params: { date: string }
}) {
  if (!isValidDate(params.date)) notFound()
  // date가 월요일이 아니면 그 주의 월요일로 redirect
  const monday = getMondayOf(params.date)
  if (monday !== params.date) {
    redirect(`/diary/week/${monday}`)
  }

  const dates = getWeekDays(monday)
  const supabase = await createClient()

  const [
    { data: entries, error: entriesErr },
    { data: quests, error: questsErr },
    { data: checks, error: checksErr },
  ] = await Promise.all([
    supabase
      .from("diary_entries")
      .select("id, date, start_time, end_time, activity_name, color")
      .in("date", dates)
      .order("start_time", { ascending: true }),
    supabase
      .from("diary_quests")
      .select("id, name, sort_order")
      .eq("active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("diary_quest_checks")
      .select("date, quest_id, checked")
      .in("date", dates),
  ])

  if (entriesErr || questsErr || checksErr) {
    const msg =
      entriesErr?.message ?? questsErr?.message ?? checksErr?.message
    return <p className="p-8 text-sm text-red-600">에러: {msg}</p>
  }

  // entries → groupBy date
  const entriesByDate: Record<string, TimelineEntry[]> = {}
  for (const d of dates) entriesByDate[d] = []
  for (const e of entries ?? []) {
    entriesByDate[e.date].push({
      id: e.id,
      start_time: e.start_time,
      end_time: e.end_time,
      activity_name: e.activity_name,
      color: e.color,
    })
  }

  // checks → groupBy date+quest_id
  const checkMap: WeekCheckMap = {}
  for (const d of dates) checkMap[d] = {}
  for (const c of checks ?? []) {
    checkMap[c.date][c.quest_id] = c.checked
  }

  const currentDate = getCurrentDate()
  const prevMonday = getPrevMonday(monday)
  const nextMonday = getNextMonday(monday)

  return (
    <div className="space-y-4 p-3 md:space-y-6 md:p-6">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/diary/week/${prevMonday}`}
          className="rounded px-2 py-1 text-sm text-neutral-600 hover:bg-neutral-100"
        >
          ← 지난주
        </Link>
        <h1 className="text-base font-bold md:text-xl">
          {formatWeekRange(monday)}
        </h1>
        <Link
          href={`/diary/week/${nextMonday}`}
          className="rounded px-2 py-1 text-sm text-neutral-600 hover:bg-neutral-100"
        >
          다음주 →
        </Link>
      </div>

      {/* Desktop: 주간 그리드 */}
      <div className="hidden space-y-4 md:block">
        <div>
          <h2 className="mb-2 text-xs font-medium text-neutral-500">
            Daily Quest (주간)
          </h2>
          <WeekQuestGrid
            dates={dates}
            quests={quests ?? []}
            initialChecks={checkMap}
            currentDate={currentDate}
          />
        </div>

        <div>
          <h2 className="mb-2 text-xs font-medium text-neutral-500">
            타임라인 (요일별 24시간, 5분 보조선)
          </h2>
          <WeekTimelineGrid
            dates={dates}
            entriesByDate={entriesByDate}
            currentDate={currentDate}
          />
        </div>

        <p className="text-xs text-neutral-400">
          ↑ 날짜·셀 탭하면 그 날 입력 페이지로 이동
        </p>
      </div>

      {/* Mobile: 7일 카드 스택 */}
      <div className="md:hidden">
        <WeekDayCardList
          dates={dates}
          entriesByDate={entriesByDate}
          currentDate={currentDate}
        />
      </div>
    </div>
  )
}
