"use client"
import { useState, useTransition } from "react"
import { updateSet, deleteSet } from "@/lib/actions/workout-sets"
import { SetTypePicker } from "./SetTypePicker"
import type { SetType } from "@/lib/validators/workout"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export type SetRowData = {
  id: string
  set_number: number
  set_type: SetType
  weight_kg: number | null
  reps: number | null
  completed: boolean
}

export function SetRow({
  set,
  prev,
  sessionId,
}: {
  set: SetRowData
  prev: { weight_kg: number | null; reps: number | null } | null
  sessionId: string
}) {
  const [weight, setWeight] = useState(set.weight_kg?.toString() ?? "")
  const [reps, setReps] = useState(set.reps?.toString() ?? "")
  const [completed, setCompleted] = useState(set.completed)
  const [type, setType] = useState<SetType>(set.set_type)
  const [pending, start] = useTransition()

  const persist = (patch: { weight_kg?: number | null; reps?: number | null; completed?: boolean; set_type?: SetType }) =>
    start(async () => {
      const r = await updateSet(set.id, sessionId, patch)
      if (!r.ok) toast.error(r.error)
    })

  const onTypeChange = (next: SetType) => {
    setType(next)
    persist({ set_type: next })
  }

  const onCommitWeight = () => {
    const v = weight.trim() === "" ? null : Number(weight)
    if (v != null && Number.isNaN(v)) { toast.error("숫자만"); setWeight(set.weight_kg?.toString() ?? ""); return }
    persist({ weight_kg: v })
  }
  const onCommitReps = () => {
    const v = reps.trim() === "" ? null : Number(reps)
    if (v != null && (Number.isNaN(v) || v < 0)) { toast.error("0 이상 숫자"); setReps(set.reps?.toString() ?? ""); return }
    persist({ reps: v })
  }
  const onToggleCompleted = () => {
    const next = !completed
    setCompleted(next)
    persist({ completed: next })
  }

  const onDelete = () =>
    start(async () => {
      const r = await deleteSet(set.id, sessionId)
      if (!r.ok) toast.error(r.error)
    })

  const prevText = prev
    ? prev.weight_kg != null && prev.reps != null
      ? `${prev.weight_kg}×${prev.reps}`
      : prev.reps != null
        ? `${prev.reps}렙`
        : prev.weight_kg != null
          ? `${prev.weight_kg}kg`
          : "-"
    : "-"

  return (
    <div className={cn(
      "grid grid-cols-[40px_60px_1fr_1fr_40px_24px] items-center gap-1 text-sm",
      completed && "bg-green-50",
    )}>
      <SetTypePicker current={type} setNumber={set.set_number} onChange={onTypeChange} />
      <div className="text-xs text-neutral-400">{prevText}</div>
      <input
        type="number"
        inputMode="decimal"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        onBlur={onCommitWeight}
        placeholder="kg"
        className="w-full rounded border border-neutral-200 px-2 py-1 text-center"
      />
      <input
        type="number"
        inputMode="numeric"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        onBlur={onCommitReps}
        placeholder="렙"
        className="w-full rounded border border-neutral-200 px-2 py-1 text-center"
      />
      <button
        onClick={onToggleCompleted}
        className={cn(
          "h-7 w-9 rounded text-xs font-bold",
          completed ? "bg-green-600 text-white" : "border border-neutral-300 text-neutral-400"
        )}
      >✓</button>
      <button onClick={onDelete} disabled={pending} className="text-xs text-neutral-300 hover:text-red-600">×</button>
    </div>
  )
}
