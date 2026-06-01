"use client"

import { useState, useTransition } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DeleteConfirmDialog } from "@/components/budget/settings/DeleteConfirmDialog"
import {
  updateDiaryQuest,
  deleteDiaryQuest,
  addDiaryQuest,
} from "@/lib/actions/diary-quests"
import { toast } from "sonner"

export type QuestRowData = {
  id: string
  name: string
  active: boolean
}

export function QuestRowComponent({
  row,
  onRemoveTemp,
}: {
  row: QuestRowData
  onRemoveTemp: (id: string) => void
}) {
  const [draft, setDraft] = useState(row)
  const [askDelete, setAskDelete] = useState(false)
  const [pending, startTransition] = useTransition()
  const isNew = draft.id.startsWith("temp-")

  const persistName = () => {
    if (!draft.name.trim()) return
    startTransition(async () => {
      const result = isNew
        ? await addDiaryQuest({ name: draft.name })
        : await updateDiaryQuest({ id: draft.id, name: draft.name })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      if (isNew) onRemoveTemp(draft.id)
    })
  }

  const onToggleActive = () => {
    if (isNew) return
    const next = !draft.active
    setDraft({ ...draft, active: next })
    startTransition(async () => {
      const result = await updateDiaryQuest({ id: draft.id, active: next })
      if (!result.ok) {
        setDraft({ ...draft, active: !next })
        toast.error(result.error)
      }
    })
  }

  const onConfirmDelete = () =>
    new Promise<void>((resolve) => {
      if (isNew) {
        onRemoveTemp(draft.id)
        resolve()
        return
      }
      startTransition(async () => {
        const result = await deleteDiaryQuest({ id: draft.id })
        if (!result.ok) toast.error(result.error)
        resolve()
      })
    })

  return (
    <div className="grid grid-cols-[60px_1fr_40px] items-center gap-2 border-b border-neutral-100 px-3 py-2">
      <button
        type="button"
        onClick={onToggleActive}
        disabled={pending}
        className={cn(
          "rounded-full px-2 py-1 text-xs font-medium transition-colors",
          draft.active
            ? "bg-emerald-500 text-white"
            : "bg-neutral-200 text-neutral-600"
        )}
      >
        {draft.active ? "✓ 활성" : "비활성"}
      </button>
      <input
        type="text"
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        onBlur={persistName}
        disabled={pending}
        className="rounded border border-neutral-300 px-2 py-1 text-sm"
        placeholder="Quest 이름"
      />
      <Button variant="ghost" size="sm" onClick={() => setAskDelete(true)}>
        🗑️
      </Button>

      <DeleteConfirmDialog
        open={askDelete}
        onOpenChange={setAskDelete}
        title="Quest 삭제"
        message={`"${draft.name}" Quest를 삭제. 과거 체크 기록도 cascade 삭제됨.`}
        onConfirm={onConfirmDelete}
      />
    </div>
  )
}
