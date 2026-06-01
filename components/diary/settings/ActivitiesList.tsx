"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  ActivityRowComponent,
  type ActivityRow,
} from "@/components/diary/settings/ActivityRow"

export function ActivitiesList({ rows }: { rows: ActivityRow[] }) {
  const [tempRows, setTempRows] = useState<ActivityRow[]>([])
  const all = [...rows, ...tempRows]

  const addTemp = () => {
    setTempRows((prev) => [
      ...prev,
      { id: `temp-${crypto.randomUUID()}`, name: "", color: "#D8D8D8" },
    ])
  }

  const removeTemp = (id: string) => {
    setTempRows((prev) => prev.filter((r) => r.id !== id))
  }

  return (
    <>
      {all.length === 0 ? (
        <p className="px-3 py-4 text-sm text-neutral-500">아직 활동 없음</p>
      ) : (
        all.map((r) => (
          <ActivityRowComponent key={r.id} row={r} onRemoveTemp={removeTemp} />
        ))
      )}
      <div className="border-t border-neutral-200 p-3">
        <Button size="sm" onClick={addTemp}>
          + 새 활동
        </Button>
      </div>
    </>
  )
}
