"use client"
import { useState, useTransition } from "react"
import { createRoutine, deleteFolder } from "@/lib/actions/workout-templates"
import { RoutineEditor, type RoutineExerciseRow } from "./RoutineEditor"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function FolderEditor({
  folder,
  routines,
  exercises,
  routineExercisesByRoutine,
}: {
  folder: { id: string; name: string }
  routines: Array<{ id: string; name: string }>
  exercises: Array<{ id: string; name: string }>
  routineExercisesByRoutine: Record<string, RoutineExerciseRow[]>
}) {
  const [newRoutineName, setNewRoutineName] = useState("")
  const [pending, start] = useTransition()

  const onAddRoutine = () => {
    if (!newRoutineName.trim()) { toast.error("이름 입력"); return }
    start(async () => {
      const r = await createRoutine({ name: newRoutineName.trim(), folder_id: folder.id })
      if (!r.ok) toast.error(r.error)
      else setNewRoutineName("")
    })
  }

  const onDeleteFolder = () => {
    if (!confirm(`폴더 "${folder.name}" 삭제? (안에 있는 루틴들의 folder_id가 null로 됨)`)) return
    start(async () => {
      const r = await deleteFolder(folder.id)
      if (!r.ok) toast.error(r.error)
    })
  }

  return (
    <section className="rounded border border-neutral-200 bg-neutral-50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">📁 {folder.name}</h3>
        <button onClick={onDeleteFolder} className="text-xs text-red-600 hover:underline">폴더 삭제</button>
      </div>
      <div className="space-y-2">
        {routines.map((r) => (
          <RoutineEditor
            key={r.id}
            routine={r}
            exercises={exercises}
            routineExercises={routineExercisesByRoutine[r.id] ?? []}
          />
        ))}
      </div>
      <div className="mt-2 flex gap-1.5">
        <input
          value={newRoutineName}
          onChange={(e) => setNewRoutineName(e.target.value)}
          placeholder="새 루틴 이름"
          className="h-8 flex-1 rounded border border-neutral-300 px-2 py-1 text-xs"
        />
        <Button size="sm" onClick={onAddRoutine} disabled={pending}>+ 루틴</Button>
      </div>
    </section>
  )
}
