import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { formatDuration, formatWeight } from "@/lib/utils/workout-format"

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
        {sessions.map((s) => {
          const finished = s.ended_at != null
          const href = finished
            ? `/workout/session/${s.id}/complete`
            : `/workout/session/${s.id}`
          return (
            <li key={s.id}>
              <Link
                href={href}
                className="block rounded border border-neutral-200 bg-white p-3 transition-colors hover:bg-neutral-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">
                      {s.routine_name ?? "빈 워크아웃"}
                    </div>
                    {s.folder_name && (
                      <div className="text-xs text-neutral-400">{s.folder_name}</div>
                    )}
                  </div>
                  {!finished && (
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      진행 중
                    </span>
                  )}
                </div>
                {finished && (
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs text-neutral-600">
                    <div>
                      <div className="text-[10px] text-neutral-400">⏱</div>
                      <div>{formatDuration(s.duration_minutes)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-neutral-400">🏋️</div>
                      <div>{formatWeight(Number(s.total_weight_kg))}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-neutral-400">🏆</div>
                      <div>{s.pr_count} PR</div>
                    </div>
                  </div>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
