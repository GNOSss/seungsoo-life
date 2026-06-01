"use client"
import { useState, useTransition } from "react"
import {
  addRoutineExercise,
  removeRoutineExercise,
  deleteRoutine,
} from "@/lib/actions/workout-templates"
import { toast } from "sonner"

export type RoutineExerciseRow = {
  id: string
  exercise_id: string
  exercise_name: string
  default_sets: number
}

export function RoutineEditor({
  routine,
  exercises,
  routineExercises,
}: {
  routine: { id: string; name: string }
  exercises: Array<{ id: string; name: string }>
  routineExercises: RoutineExerciseRow[]
}) {
  const [pickerExId, setPickerExId] = useState("")
  const [pickerSets, setPickerSets] = useState(3)
  const [pending, start] = useTransition()

  const onAdd = () => {
    if (!pickerExId) {
      toast.error("운동 선택")
      return
    }
    start(async () => {
      const r = await addRoutineExercise({
        routine_id: routine.id,
        exercise_id: pickerExId,
        default_sets: pickerSets,
      })
      if (!r.ok) toast.error(r.error)
      else { setPickerExId(""); setPickerSets(3) }
    })
  }

  const onRemove = (id: string) =>
    start(async () => {
      const r = await removeRoutineExercise(id)
      if (!r.ok) toast.error(r.error)
    })

  const onDelete = () => {
    if (!confirm(`루틴 "${routine.name}" 삭제? (운동 종목은 보존됨)`)) return
    start(async () => {
      const r = await deleteRoutine(routine.id)
      if (!r.ok) toast.error(r.error)
    })
  }

  return (
    <div className="space-y-2 rounded border border-neutral-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{routine.name}</h4>
        <button onClick={onDelete} disabled={pending} className="text-xs text-red-600 hover:underline">루틴 삭제</button>
      </div>
      <ul className="space-y-1">
        {routineExercises.map((re) => (
          <li key={re.id} className="flex items-center justify-between rounded bg-neutral-50 px-2 py-1 text-xs">
            <span>{re.exercise_name} <span className="text-neutral-400">×{re.default_sets}세트</span></span>
            <button onClick={() => onRemove(re.id)} disabled={pending} className="text-red-600 hover:underline">×</button>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-1.5">
        <select
          value={pickerExId}
          onChange={(e) => setPickerExId(e.target.value)}
          className="flex-1 rounded border border-neutral-300 px-1.5 py-1 text-xs"
        >
          <option value="">운동 선택...</option>
          {exercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
        </select>
        <input
          type="number"
          value={pickerSets}
          onChange={(e) => setPickerSets(Number(e.target.value))}
          min={1} max={20}
          className="w-12 rounded border border-neutral-300 px-1 py-1 text-xs"
        />
        <button
          onClick={onAdd}
          disabled={pending}
          className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-60"
        >+ 추가</button>
      </div>
    </div>
  )
}
