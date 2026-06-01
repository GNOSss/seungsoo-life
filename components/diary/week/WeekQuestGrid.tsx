"use client"

import { useState, useTransition } from "react"
import { cn } from "@/lib/utils"
import { getDayOfWeekKorean, parseDate } from "@/lib/utils/diary-date"
import { toggleQuestCheck } from "@/lib/actions/diary-quest-checks"
import { toast } from "sonner"

export type WeekQuestRow = { id: string; name: string }
export type WeekCheckMap = Record<string, Record<string, boolean>> // [date][questId] = checked

export function WeekQuestGrid({
  dates,
  quests,
  initialChecks,
  currentDate,
}: {
  dates: string[]
  quests: WeekQuestRow[]
  initialChecks: WeekCheckMap
  currentDate: string
}) {
  const [checks, setChecks] = useState<WeekCheckMap>(initialChecks)
  const [, startTransition] = useTransition()

  if (quests.length === 0) {
    return (
      <p className="text-xs text-neutral-400">
        Quest 미설정 — 설정에서 추가하세요
      </p>
    )
  }

  const onToggle = (date: string, questId: string) => {
    const prev = checks[date]?.[questId] ?? false
    const next = !prev
    setChecks((c) => ({
      ...c,
      [date]: { ...(c[date] ?? {}), [questId]: next },
    }))
    startTransition(async () => {
      const result = await toggleQuestCheck({
        date,
        quest_id: questId,
        checked: next,
      })
      if (!result.ok) {
        setChecks((c) => ({
          ...c,
          [date]: { ...(c[date] ?? {}), [questId]: prev },
        }))
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="overflow-hidden rounded border border-neutral-200 bg-white">
      {/* Header row: 빈 칸 + 요일 7개 */}
      <div className="grid grid-cols-[100px_repeat(7,1fr)] border-b border-neutral-300 bg-neutral-50 text-xs font-medium text-neutral-500">
        <div className="px-2 py-1.5">Quest \ 요일</div>
        {dates.map((d) => {
          const { day } = parseDate(d)
          const dow = getDayOfWeekKorean(d)
          const isToday = d === currentDate
          return (
            <div
              key={d}
              className={cn(
                "border-l border-neutral-200 px-1 py-1.5 text-center",
                isToday && "bg-yellow-50 font-bold"
              )}
            >
              {dow} {day}
            </div>
          )
        })}
      </div>

      {/* Quest rows */}
      {quests.map((q) => (
        <div
          key={q.id}
          className="grid grid-cols-[100px_repeat(7,1fr)] border-b border-neutral-100 last:border-b-0"
        >
          <div className="truncate px-2 py-1.5 text-xs">{q.name}</div>
          {dates.map((d) => {
            const checked = checks[d]?.[q.id] ?? false
            return (
              <button
                key={d}
                type="button"
                onClick={() => onToggle(d, q.id)}
                className={cn(
                  "flex items-center justify-center border-l border-neutral-100 py-1.5 transition-colors hover:bg-neutral-50"
                )}
                aria-label={`${d} ${q.name} ${checked ? "체크 해제" : "체크"}`}
              >
                <span
                  className={cn(
                    "block size-4 rounded-sm border",
                    checked
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-neutral-300"
                  )}
                >
                  {checked ? (
                    <span className="block text-center text-[10px] leading-4 text-white">
                      ✓
                    </span>
                  ) : null}
                </span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
