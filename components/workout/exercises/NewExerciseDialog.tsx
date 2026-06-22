"use client"
import { useState, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createExercise } from "@/lib/actions/workout-exercises"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { BodyPart, Category } from "@/lib/validators/workout"

const BODY_PARTS: BodyPart[] = ["Arms","Back","Cardio","Chest","Core","Full Body","Legs","Olympic","Other","Shoulders"]
const CATEGORIES: Category[] = ["Barbell","Dumbbell","Machine","Smith Machine","Cable","Bodyweight","Assisted Bodyweight","Reps Only","Cardio","Duration","Other"]

export function NewExerciseDialog({
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onCreated,
}: {
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onCreated?: (id: string) => void
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const setOpen = controlledOnOpenChange ?? setUncontrolledOpen
  const [name, setName] = useState("")
  const [bodyPart, setBodyPart] = useState<BodyPart | "">("")
  const [category, setCategory] = useState<Category | "">("")
  const [pending, start] = useTransition()

  const onSave = () => {
    if (!name.trim() || !bodyPart || !category) {
      toast.error("이름·부위·카테고리 모두 입력")
      return
    }
    start(async () => {
      const r = await createExercise({ name: name.trim(), body_part: bodyPart, category })
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success("운동 추가됨")
      setName(""); setBodyPart(""); setCategory("")
      setOpen(false)
      onCreated?.(r.data!.id)
    })
  }

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)} style={{ display: "contents" }}>{trigger}</span>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>새 운동 만들기</DialogTitle>
        </DialogHeader>
        <div className="mt-3 space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름 (예: Bench Press)"
            className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
          />
          <div>
            <div className="mb-1 text-xs text-neutral-500">부위</div>
            <div className="flex flex-wrap gap-1.5">
              {BODY_PARTS.map((bp) => (
                <button
                  key={bp}
                  type="button"
                  onClick={() => setBodyPart(bp)}
                  className={cn(
                    "rounded border px-2 py-1 text-xs",
                    bodyPart === bp ? "border-blue-600 bg-blue-50 text-blue-700" : "border-neutral-200 text-neutral-600"
                  )}
                >{bp}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs text-neutral-500">카테고리</div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
            >
              <option value="">선택...</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>취소</Button>
          <Button size="sm" onClick={onSave} disabled={pending}>{pending ? "저장 중..." : "저장"}</Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
