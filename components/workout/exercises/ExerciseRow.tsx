"use client"
import { useTransition } from "react"
import { deleteExercise } from "@/lib/actions/workout-exercises"
import { toast } from "sonner"

export function ExerciseRow({ ex }: { ex: { id: string; name: string; body_part: string; category: string } }) {
  const [pending, start] = useTransition()
  const onDelete = () => {
    if (!confirm(`"${ex.name}" 삭제? 이 종목을 포함한 루틴·세션 기록은 보존됨.`)) return
    start(async () => {
      const r = await deleteExercise(ex.id)
      if (!r.ok) toast.error(r.error)
      else toast.success("삭제됨")
    })
  }
  return (
    <li className="flex items-center justify-between rounded border border-neutral-200 bg-white px-3 py-2">
      <div>
        <div className="text-sm font-medium">{ex.name}</div>
        <div className="text-xs text-neutral-500">{ex.body_part} · {ex.category}</div>
      </div>
      <button onClick={onDelete} disabled={pending} className="text-xs text-red-600 hover:underline">삭제</button>
    </li>
  )
}
