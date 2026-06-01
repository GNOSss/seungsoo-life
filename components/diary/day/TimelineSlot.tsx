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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      <div className="h-7 border-b border-neutral-100" aria-hidden="true" />
    )
  }
  const light = isLightColor(entry.color)
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-7 truncate border-b border-white/30 px-1 text-left text-[11px] font-medium leading-none transition-opacity hover:opacity-80"
      )}
      style={{ backgroundColor: entry.color }}
      title={`${entry.start_time.slice(0, 5)}-${entry.end_time.slice(0, 5)} ${entry.activity_name}`}
    >
      <span
        className={cn(
          "block truncate",
          light
            ? "text-neutral-800"
            : "text-white [text-shadow:_0_1px_2px_rgba(0,0,0,0.4)]"
        )}
      >
        {showLabel ? entry.activity_name : ""}
      </span>
    </button>
  )
}

/**
 * 텍스트 색 결정. luminance 130 미만은 dark → white text.
 * 130을 기준으로 잡으면 #4A4A4A(쉼), #7B68EE(공부) 같은 중간 톤도 dark로 분류되어
 * 흰색 텍스트가 잘 보임.
 */
function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return r * 0.299 + g * 0.587 + b * 0.114 > 130
}
