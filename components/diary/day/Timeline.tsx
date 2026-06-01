"use client"

import { useState } from "react"
import { TimelineSlot, type TimelineEntry } from "./TimelineSlot"
import { ColorPalette } from "./ColorPalette"

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

function findEntryAtSlot(
  entries: TimelineEntry[],
  slotStart: number,
  slotEnd: number
): TimelineEntry | null {
  for (const e of entries) {
    const s = timeToMinutes(e.start_time)
    const eEnd = timeToMinutes(e.end_time)
    if (s < slotEnd && eEnd > slotStart) return e
  }
  return null
}

function isFirstSlot(entry: TimelineEntry, slotStart: number): boolean {
  const s = timeToMinutes(entry.start_time)
  return Math.floor(s / 15) * 15 === slotStart
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
      <div className="overflow-hidden rounded border border-neutral-200">
        {Array.from({ length: 24 }, (_, h) => (
          <div
            key={h}
            className="grid grid-cols-[40px_repeat(4,1fr)] border-b border-neutral-200 last:border-b-0"
          >
            <div className="flex items-center justify-center bg-neutral-50 text-[10px] text-neutral-400 tabular-nums">
              {String(h).padStart(2, "0")}
            </div>
            {Array.from({ length: 4 }, (_, q) => {
              const slotStart = h * 60 + q * 15
              const slotEnd = slotStart + 15
              const entry = findEntryAtSlot(entries, slotStart, slotEnd)
              return (
                <TimelineSlot
                  key={q}
                  entry={entry}
                  slotStartMinute={slotStart}
                  showLabel={entry ? isFirstSlot(entry, slotStart) : false}
                  onClick={() => entry && setSelected(entry)}
                />
              )
            })}
          </div>
        ))}
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
