"use client"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { deleteSession } from "@/lib/actions/workout-sessions"
import { formatDuration, formatWeight } from "@/lib/utils/workout-format"
import { toast } from "sonner"

export type SessionCardData = {
  id: string
  routine_name: string | null
  folder_name: string | null
  ended_at: string | null
  duration_minutes: number | null
  total_weight_kg: number
  pr_count: number
}

export function SessionCard({
  session,
  date,
}: {
  session: SessionCardData
  date: string
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const finished = session.ended_at != null
  const href = finished
    ? `/workout/session/${session.id}/complete`
    : `/workout/session/${session.id}`

  const onDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!confirm(`"${session.routine_name ?? "빈 워크아웃"}" 삭제하시겠습니까?`)) return
    start(async () => {
      const r = await deleteSession(session.id)
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success("삭제됐습니다.")
      router.refresh()
    })
  }

  return (
    <li className="relative">
      <Link
        href={href}
        className="block rounded border border-neutral-200 bg-white p-3 pr-16 transition-colors hover:bg-neutral-50"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">
              {session.routine_name ?? "빈 워크아웃"}
            </div>
            {session.folder_name && (
              <div className="text-xs text-neutral-400">{session.folder_name}</div>
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
              <div>{formatDuration(session.duration_minutes)}</div>
            </div>
            <div>
              <div className="text-[10px] text-neutral-400">🏋️</div>
              <div>{formatWeight(Number(session.total_weight_kg))}</div>
            </div>
            <div>
              <div className="text-[10px] text-neutral-400">🏆</div>
              <div>{session.pr_count} PR</div>
            </div>
          </div>
        )}
      </Link>
      <button
        onClick={onDelete}
        disabled={pending}
        className="absolute right-3 top-3 rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
      >
        삭제
      </button>
    </li>
  )
}
