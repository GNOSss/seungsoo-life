"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { getDayOfWeekKorean, parseDate } from "@/lib/utils/diary-date"
import { type TimelineEntry } from "@/components/diary/day/Timeline"

/** 모바일용 7일 카드 리스트 (세로 스택). 각 카드 탭 → /diary/[date]. */
export function WeekDayCardList({
  dates,
  entriesByDate,
  currentDate,
}: {
  dates: string[]
  entriesByDate: Record<string, TimelineEntry[]>
  currentDate: string
}) {
  return (
    <div className="space-y-2">
      {dates.map((d) => {
        const dayEntries = entriesByDate[d] ?? []
        const { day } = parseDate(d)
        const dow = getDayOfWeekKorean(d)
        const isToday = d === currentDate
        return (
          <Link
            key={d}
            href={`/diary/${d}`}
            className={cn(
              "block rounded border border-neutral-200 bg-white p-3 transition-colors hover:bg-neutral-50",
              isToday && "border-yellow-300 bg-yellow-50"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-base font-semibold">
                  {dow} {day}일
                </span>
                {isToday ? (
                  <span className="text-xs text-yellow-700">오늘</span>
                ) : null}
              </div>
              <span className="text-xs text-neutral-500">
                {dayEntries.length > 0
                  ? `${dayEntries.length}건 기록`
                  : "비어있음"}
              </span>
            </div>
            {dayEntries.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {dayEntries.slice(0, 8).map((e) => (
                  <span
                    key={e.id}
                    className="inline-block size-3 rounded-sm"
                    style={{ backgroundColor: e.color }}
                    title={e.activity_name}
                  />
                ))}
                {dayEntries.length > 8 ? (
                  <span className="text-[10px] text-neutral-400">
                    +{dayEntries.length - 8}
                  </span>
                ) : null}
              </div>
            ) : null}
          </Link>
        )
      })}
    </div>
  )
}
