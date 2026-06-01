"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { DeleteConfirmDialog } from "@/components/budget/settings/DeleteConfirmDialog"
import {
  updateDiaryActivity,
  deleteDiaryActivity,
  addDiaryActivity,
} from "@/lib/actions/diary-activities"
import { toast } from "sonner"

export type ActivityRow = {
  id: string
  name: string
  color: string
}

export function ActivityRowComponent({
  row,
  onRemoveTemp,
}: {
  row: ActivityRow
  onRemoveTemp: (id: string) => void
}) {
  const [draft, setDraft] = useState(row)
  const [askDelete, setAskDelete] = useState(false)
  const [pending, startTransition] = useTransition()
  const isNew = draft.id.startsWith("temp-")

  const persist = () => {
    if (!draft.name.trim()) return
    if (!/^#[0-9a-fA-F]{6}$/.test(draft.color)) return
    startTransition(async () => {
      const result = isNew
        ? await addDiaryActivity({ name: draft.name, color: draft.color })
        : await updateDiaryActivity({
            id: draft.id,
            name: draft.name,
            color: draft.color,
          })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      if (isNew) onRemoveTemp(draft.id)
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
        const result = await deleteDiaryActivity({ id: draft.id })
        if (!result.ok) toast.error(result.error)
        resolve()
      })
    })

  return (
    <div className="grid grid-cols-[60px_1fr_100px_40px] items-center gap-2 border-b border-neutral-100 px-3 py-2">
      <input
        type="color"
        value={draft.color}
        onChange={(e) => setDraft({ ...draft, color: e.target.value })}
        onBlur={persist}
        disabled={pending}
        className="h-8 w-12 rounded border border-neutral-300"
      />
      <input
        type="text"
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        onBlur={persist}
        disabled={pending}
        className="rounded border border-neutral-300 px-2 py-1 text-sm"
        placeholder="키워드 (콤마로 구분, 예: 잠,화장실,샤워)"
      />
      <input
        type="text"
        value={draft.color}
        onChange={(e) => setDraft({ ...draft, color: e.target.value })}
        onBlur={persist}
        disabled={pending}
        className="rounded border border-neutral-300 px-2 py-1 font-mono text-xs uppercase"
      />
      <Button variant="ghost" size="sm" onClick={() => setAskDelete(true)}>
        🗑️
      </Button>

      <DeleteConfirmDialog
        open={askDelete}
        onOpenChange={setAskDelete}
        title="활동 삭제"
        message={`"${draft.name}" 활동을 라이브러리에서 삭제. 과거 entries 색은 그대로 유지 (스냅샷).`}
        onConfirm={onConfirmDelete}
      />
    </div>
  )
}
