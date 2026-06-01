"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  QuestRowComponent,
  type QuestRowData,
} from "@/components/diary/settings/QuestRow"

export function QuestsList({ rows }: { rows: QuestRowData[] }) {
  const [tempRows, setTempRows] = useState<QuestRowData[]>([])
  const all = [...rows, ...tempRows]

  const addTemp = () => {
    setTempRows((prev) => [
      ...prev,
      { id: `temp-${crypto.randomUUID()}`, name: "", active: true },
    ])
  }
  const removeTemp = (id: string) => {
    setTempRows((prev) => prev.filter((r) => r.id !== id))
  }

  return (
    <>
      {all.length === 0 ? (
        <p className="px-3 py-4 text-sm text-neutral-500">아직 Quest 없음</p>
      ) : (
        all.map((r) => (
          <QuestRowComponent key={r.id} row={r} onRemoveTemp={removeTemp} />
        ))
      )}
      <div className="border-t border-neutral-200 p-3">
        <Button size="sm" onClick={addTemp}>
          + 새 Quest
        </Button>
      </div>
    </>
  )
}
