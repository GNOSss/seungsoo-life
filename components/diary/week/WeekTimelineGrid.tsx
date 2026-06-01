"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { getDayOfWeekKorean, parseDate } from "@/lib/utils/diary-date"
import { type TimelineEntry } from "@/components/diary/day/Timeline"

const ROW_HEIGHT_PX = 32 // 시간당 32px (주간 7컬럼이라 약간 작게)
const TOTAL_HEIGHT_PX = 24 * ROW_HEIGHT_PX
const SUB_LINES_PER_HOUR = 11

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return r * 0.299 + g * 0.587 + b * 0.114 > 130
}

function fontSizeForHeight(height: number): string {
  if (height < 14) return "text-[8px]"
  if (height < 24) return "text-[10px]"
  if (height < 48) return "text-xs"
  if (height < 96) return "text-base"
  if (height < 160) return "text-xl"
  return "text-2xl"
}

export function WeekTimelineGrid({
  dates,
  entriesByDate,
  currentDate,
}: {
  dates: string[] // 7 dates (월~일)
  entriesByDate: Record<string, TimelineEntry[]>
  currentDate: string
}) {
  return (
    <div className="overflow-hidden rounded border border-neutral-200 bg-white">
      {/* 요일 헤더 */}
      <div className="grid grid-cols-[36px_repeat(7,1fr)] border-b border-neutral-300 bg-neutral-50">
        <div />
        {dates.map((d) => {
          const { day } = parseDate(d)
          const dow = getDayOfWeekKorean(d)
          const isToday = d === currentDate
          return (
            <Link
              key={d}
              href={`/diary/${d}`}
              className={cn(
                "border-l border-neutral-200 px-1 py-2 text-center text-xs transition-colors hover:bg-neutral-100",
                isToday
                  ? "bg-yellow-50 font-bold text-neutral-900"
                  : "text-neutral-600"
              )}
            >
              <span className="block">{dow}</span>
              <span className="block text-[10px] text-neutral-400">{day}</span>
            </Link>
          )
        })}
      </div>

      {/* Body */}
      <div
        className="relative grid grid-cols-[36px_repeat(7,1fr)]"
        style={{ height: `${TOTAL_HEIGHT_PX}px` }}
      >
        {/* 시간 라벨 컬럼 */}
        <div className="relative border-r border-neutral-200 bg-neutral-50">
          {Array.from({ length: 24 }, (_, h) => (
            <div
              key={h}
              className="absolute left-0 right-0 flex items-start justify-center pt-0.5 text-[9px] text-neutral-400 tabular-nums"
              style={{ top: `${h * ROW_HEIGHT_PX}px`, height: `${ROW_HEIGHT_PX}px` }}
            >
              {String(h).padStart(2, "0")}
            </div>
          ))}
        </div>

        {/* 7 day columns */}
        {dates.map((d) => {
          const dayEntries = entriesByDate[d] ?? []
          return (
            <Link
              key={d}
              href={`/diary/${d}`}
              className="relative border-l border-neutral-200 transition-colors hover:bg-neutral-50"
            >
              {/* 시간 그리드 (시간 보더 + 5분 subtle) */}
              {Array.from({ length: 24 }, (_, h) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-b border-neutral-200"
                  style={{
                    top: `${h * ROW_HEIGHT_PX}px`,
                    height: `${ROW_HEIGHT_PX}px`,
                  }}
                  aria-hidden="true"
                >
                  {Array.from({ length: SUB_LINES_PER_HOUR }, (_, m) => (
                    <div
                      key={m}
                      className="absolute left-0 right-0 border-b border-neutral-100"
                      style={{
                        top: `${((m + 1) * ROW_HEIGHT_PX) / 12}px`,
                      }}
                    />
                  ))}
                </div>
              ))}

              {/* 활동 블록 */}
              {dayEntries.map((entry) => {
                const startMin = timeToMinutes(entry.start_time)
                const endMin = timeToMinutes(entry.end_time)
                const top = (startMin / 60) * ROW_HEIGHT_PX
                const height = Math.max(
                  ((endMin - startMin) / 60) * ROW_HEIGHT_PX,
                  3
                )
                const light = isLightColor(entry.color)
                const fontClass = fontSizeForHeight(height)
                return (
                  <div
                    key={entry.id}
                    className={cn(
                      "absolute left-0 right-0 flex items-center justify-center overflow-hidden px-1 text-center font-semibold leading-tight",
                      fontClass,
                      light
                        ? "text-neutral-800"
                        : "text-white [text-shadow:_0_1px_2px_rgba(0,0,0,0.4)]"
                    )}
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      backgroundColor: entry.color,
                    }}
                    title={`${entry.start_time.slice(0, 5)}-${entry.end_time.slice(0, 5)} ${entry.activity_name}`}
                  >
                    <span className="truncate">{entry.activity_name}</span>
                  </div>
                )
              })}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
