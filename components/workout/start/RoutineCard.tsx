"use client"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { startSessionFromRoutine } from "@/lib/actions/workout-sessions"
import { toast } from "sonner"

export function RoutineCard({ routine }: { routine: { id: string; name: string; exerciseCount: number } }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const onClick = () =>
    start(async () => {
      const result = await startSessionFromRoutine(routine.id)
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      router.push(`/workout/session/${result.id}`)
    })
  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="flex w-full items-center justify-between rounded border border-neutral-200 bg-white p-3 text-left transition-colors hover:bg-neutral-50 disabled:opacity-60"
    >
      <div>
        <div className="text-sm font-medium">{routine.name}</div>
        <div className="text-xs text-neutral-500">{routine.exerciseCount}개 운동</div>
      </div>
      <span className="text-blue-600">▶</span>
    </button>
  )
}
