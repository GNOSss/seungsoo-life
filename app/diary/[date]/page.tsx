import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  isValidDate,
  formatDateKorean,
  getPrevDate,
} from "@/lib/utils/diary-date"
import { QuestCheckRow } from "@/components/diary/day/QuestCheckRow"
import { EntryInput } from "@/components/diary/day/EntryInput"
import { Timeline, type TimelineEntry } from "@/components/diary/day/Timeline"

export default async function DiaryDatePage({
  params,
}: {
  params: { date: string }
}) {
  if (!isValidDate(params.date)) notFound()

  const supabase = await createClient()
  const prevDate = getPrevDate(params.date)

  const [
    { data: day, error: dayErr },
    { data: entries, error: entriesErr },
    { data: quests, error: questsErr },
    { data: checks, error: checksErr },
    { data: activities, error: actsErr },
    { data: prevDayLastEntry, error: prevErr },
  ] = await Promise.all([
    supabase
      .from("diary_days")
      .select("raw_input")
      .eq("date", params.date)
      .maybeSingle(),
    supabase
      .from("diary_entries")
      .select("id, start_time, end_time, activity_name, color")
      .eq("date", params.date)
      .order("start_time", { ascending: true }),
    supabase
      .from("diary_quests")
      .select("id, name, sort_order")
      .eq("active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("diary_quest_checks")
      .select("quest_id, checked")
      .eq("date", params.date),
    supabase
      .from("diary_activities")
      .select("name, color")
      .order("sort_order", { ascending: true }),
    supabase
      .from("diary_entries")
      .select("end_time")
      .eq("date", prevDate)
      .order("end_time", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (dayErr || entriesErr || questsErr || checksErr || actsErr || prevErr) {
    const msg =
      dayErr?.message ??
      entriesErr?.message ??
      questsErr?.message ??
      checksErr?.message ??
      actsErr?.message ??
      prevErr?.message
    return <p className="p-8 text-sm text-red-600">에러: {msg}</p>
  }

  const initialChecks: Record<string, boolean> = {}
  for (const c of checks ?? []) {
    initialChecks[c.quest_id] = c.checked
  }

  const timelineEntries: TimelineEntry[] = (entries ?? []).map((e) => ({
    id: e.id,
    start_time: e.start_time,
    end_time: e.end_time,
    activity_name: e.activity_name,
    color: e.color,
  }))

  return (
    <div className="space-y-4 p-3 md:space-y-6 md:p-6">
      <h1 className="text-xl font-bold md:text-2xl">
        {formatDateKorean(params.date)}
      </h1>

      <div>
        <h2 className="mb-2 text-xs font-medium text-neutral-500">
          Daily Quest
        </h2>
        <QuestCheckRow
          date={params.date}
          quests={quests ?? []}
          initialChecks={initialChecks}
        />
      </div>

      <EntryInput
        date={params.date}
        initialRawInput={day?.raw_input ?? ""}
        prevDayLastEnd={prevDayLastEntry?.end_time ?? null}
      />

      <div>
        <h2 className="mb-2 text-xs font-medium text-neutral-500">
          타임라인 (24시간 · 15분 슬롯)
        </h2>
        <Timeline
          entries={timelineEntries}
          date={params.date}
          paletteColors={activities ?? []}
        />
      </div>
    </div>
  )
}
