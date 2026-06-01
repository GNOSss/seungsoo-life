"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { ColorPalette } from "./ColorPalette"

export type TimelineEntry = {
  id: string
  start_time: string
  end_time: string
  activity_name: string
  color: string
}

const ROW_HEIGHT_PX = 48 // 1시간 = 48px
const TOTAL_HEIGHT_PX = 24 * ROW_HEIGHT_PX // 1152px
const HOUR_LABEL_WIDTH = 40
const SUB_LINES_PER_HOUR = 11 // 5분 단위 (60/5=12개 슬라이스, 보더 11개)

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

/** 블록 높이에 따른 폰트 클래스 */
function fontSizeForHeight(height: number): string {
  if (height < 18) return "text-[9px]"
  if (height < 36) return "text-xs"
  if (height < 72) return "text-base"
  if (height < 144) return "text-2xl"
  if (height < 240) return "text-3xl"
  return "text-4xl"
}

export function Timeline({
  entries,
  date,
  paletteColors,
}: {
  entries: TimelineEntry[]
  date: string
  paletteColors: { name: string; color: string }[]
}) {
  const [selected, setSelected] = useState<TimelineEntry | null>(null)

  return (
    <>
      <div
        className="relative overflow-hidden rounded border border-neutral-200 bg-white"
        style={{ height: `${TOTAL_HEIGHT_PX}px` }}
      >
        {/* 시간 그리드 (시간 라벨 + 5분 보조선) */}
        {Array.from({ length: 24 }, (_, h) => {
          const top = h * ROW_HEIGHT_PX
          return (
            <div
              key={h}
              className="absolute left-0 right-0 border-b border-neutral-300"
              style={{ top: `${top}px`, height: `${ROW_HEIGHT_PX}px` }}
              aria-hidden="true"
            >
              <div
                className="absolute left-0 top-0 flex h-full items-center justify-center border-r border-neutral-200 bg-neutral-50 text-[10px] text-neutral-400 tabular-nums"
                style={{ width: `${HOUR_LABEL_WIDTH}px` }}
              >
                {String(h).padStart(2, "0")}
              </div>
              {/* 5분 보조선 (시간당 11개) */}
              {Array.from({ length: SUB_LINES_PER_HOUR }, (_, m) => (
                <div
                  key={m}
                  className="absolute right-0 border-b border-neutral-100"
                  style={{
                    left: `${HOUR_LABEL_WIDTH}px`,
                    top: `${((m + 1) * ROW_HEIGHT_PX) / 12}px`,
                  }}
                />
              ))}
            </div>
          )
        })}

        {/* 활동 블록 (absolute, 활동 1개당 1개 블록) */}
        {entries.map((entry) => {
          const startMin = timeToMinutes(entry.start_time)
          const endMin = timeToMinutes(entry.end_time)
          const top = (startMin / 60) * ROW_HEIGHT_PX
          const height = Math.max(((endMin - startMin) / 60) * ROW_HEIGHT_PX, 4)
          const light = isLightColor(entry.color)
          const fontClass = fontSizeForHeight(height)

          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setSelected(entry)}
              className={cn(
                "absolute flex items-center justify-center text-center font-semibold transition-opacity hover:opacity-80",
                fontClass,
                light
                  ? "text-neutral-800"
                  : "text-white [text-shadow:_0_1px_2px_rgba(0,0,0,0.4)]"
              )}
              style={{
                top: `${top}px`,
                height: `${height}px`,
                left: `${HOUR_LABEL_WIDTH}px`,
                right: 0,
                backgroundColor: entry.color,
              }}
              title={`${entry.start_time.slice(0, 5)}-${entry.end_time.slice(0, 5)} ${entry.activity_name}`}
            >
              <span className="truncate px-2 leading-tight">
                {entry.activity_name}
              </span>
            </button>
          )
        })}
      </div>

      <ColorPalette
        open={selected !== null}
        onClose={() => setSelected(null)}
        activityName={selected?.activity_name ?? ""}
        currentColor={selected?.color ?? "#D8D8D8"}
        paletteColors={paletteColors}
        date={date}
      />
    </>
  )
}
