"use client"

import { useState, useTransition } from "react"
import { cn } from "@/lib/utils"
import { toggleQuestCheck } from "@/lib/actions/diary-quest-checks"
import { toast } from "sonner"

export type QuestItem = { id: string; name: string }
export type CheckMap = Record<string, boolean>

export function QuestCheckRow({
  date,
  quests,
  initialChecks,
}: {
  date: string
  quests: QuestItem[]
  initialChecks: CheckMap
}) {
  const [checks, setChecks] = useState<CheckMap>(initialChecks)
  const [pending, startTransition] = useTransition()

  const onToggle = (questId: string) => {
    const next = !checks[questId]
    setChecks((prev) => ({ ...prev, [questId]: next }))
    startTransition(async () => {
      const result = await toggleQuestCheck({
        date,
        quest_id: questId,
        checked: next,
      })
      if (!result.ok) {
        setChecks((prev) => ({ ...prev, [questId]: !next }))
        toast.error(result.error)
      }
    })
  }

  if (quests.length === 0) {
    return (
      <p className="text-xs text-neutral-400">
        Quest 미설정 — 설정에서 추가하세요
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {quests.map((q) => {
        const checked = !!checks[q.id]
        return (
          <button
            key={q.id}
            type="button"
            onClick={() => onToggle(q.id)}
            disabled={pending}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              checked
                ? "border-emerald-500 bg-emerald-500 text-white"
                : "border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50"
            )}
          >
            {checked ? "✓ " : "○ "}
            {q.name}
          </button>
        )
      })}
    </div>
  )
}
