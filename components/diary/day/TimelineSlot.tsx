"use client"

import { cn } from "@/lib/utils"

export type TimelineEntry = {
  id: string
  start_time: string
  end_time: string
  activity_name: string
  color: string
}

export function TimelineSlot({
  entry,
  slotStartMinute,
  showLabel,
  onClick,
}: {
  entry: TimelineEntry | null
  slotStartMinute: number
  showLabel: boolean
  onClick: () => void
}) {
  if (!entry) {
    return (
      <div className="h-6 border-b border-neutral-100" aria-hidden="true" />
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-6 truncate border-b border-white/30 px-1 text-left text-[10px] leading-none transition-opacity hover:opacity-80"
      )}
      style={{ backgroundColor: entry.color }}
      title={`${entry.start_time.slice(0, 5)}-${entry.end_time.slice(0, 5)} ${entry.activity_name}`}
    >
      <span
        className={cn(
          "block truncate",
          isLightColor(entry.color) ? "text-neutral-700" : "text-white"
        )}
      >
        {showLabel ? entry.activity_name : ""}
      </span>
    </button>
  )
}

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return r * 0.299 + g * 0.587 + b * 0.114 > 186
}
