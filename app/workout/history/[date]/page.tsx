import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { SessionCard } from "@/components/workout/history/SessionCard"

export default async function HistoryDatePage({
  params,
}: {
  params: Promise<{ date: string }>
}) {
  const { date } = await params

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select(
      "id, routine_name, folder_name, started_at, ended_at, duration_minutes, total_weight_kg, pr_count"
    )
    .eq("user_id", user.id)
    .eq("date", date)
    .order("started_at", { ascending: true })

  if (!sessions || sessions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl p-4 md:p-6">
        <h1 className="text-xl font-bold md:text-2xl">📅 {date}</h1>
        <p className="mt-4 rounded border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
          이 날 워크아웃 기록이 없습니다.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3 p-4 md:p-6">
      <h1 className="text-xl font-bold md:text-2xl">📅 {date}</h1>
      <p className="text-xs text-neutral-500">{sessions.length}개 세션</p>
      <ul className="space-y-2">
        {sessions.map((s) => (
          <SessionCard
            key={s.id}
            date={date}
            session={{
              id: s.id,
              routine_name: s.routine_name,
              folder_name: s.folder_name,
              ended_at: s.ended_at,
              duration_minutes: s.duration_minutes,
              total_weight_kg: Number(s.total_weight_kg),
              pr_count: s.pr_count,
            }}
          />
        ))}
      </ul>
    </div>
  )
}
