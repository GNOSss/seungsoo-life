"use client"
import { useState, useTransition } from "react"
import { Drawer } from "vaul"
import { addExerciseToSession } from "@/lib/actions/workout-sessions"
import { NewExerciseDialog } from "@/components/workout/exercises/NewExerciseDialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function AddExerciseSheet({
  sessionId,
  allExercises,
}: {
  sessionId: string
  allExercises: Array<{ id: string; name: string; body_part: string }>
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const [pending, start] = useTransition()

  const filtered = allExercises.filter((ex) =>
    ex.name.toLowerCase().includes(q.toLowerCase())
  )

  const onPick = (exerciseId: string) =>
    start(async () => {
      const r = await addExerciseToSession(sessionId, exerciseId)
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success("운동 추가됨")
      setOpen(false)
      setQ("")
    })

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        <Button variant="outline" className="w-full">+ 운동 추가</Button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 mt-24 flex max-h-[85vh] flex-col rounded-t-lg bg-white p-4">
          <Drawer.Title className="mb-2 text-base font-semibold">운동 추가</Drawer.Title>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="검색..."
            className="mb-3 w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          />
          <div className="flex-1 overflow-y-auto">
            <ul className="space-y-1">
              {filtered.map((ex) => (
                <li key={ex.id}>
                  <button
                    onClick={() => onPick(ex.id)}
                    disabled={pending}
                    className="flex w-full items-center justify-between rounded border border-neutral-200 px-3 py-2 text-left text-sm hover:bg-neutral-50 disabled:opacity-60"
                  >
                    <span>{ex.name}</span>
                    <span className="text-xs text-neutral-400">{ex.body_part}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <NewExerciseDialog
            trigger={<Button variant="outline" className="mt-3 w-full">+ 새 운동 만들기</Button>}
            onCreated={(id) => onPick(id)}
          />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
