"use client"
import { useState } from "react"
import { cn } from "@/lib/utils"
import type { SetType } from "@/lib/validators/workout"

const TYPES: Array<{ key: SetType; label: string; cls: string }> = [
  { key: "warmup",  label: "W", cls: "bg-orange-500 text-white" },
  { key: "working", label: "본",  cls: "bg-neutral-700 text-white" },
  { key: "failure", label: "F", cls: "bg-red-600 text-white" },
]

export function SetTypePicker({
  current,
  setNumber,
  onChange,
}: {
  current: SetType
  setNumber: number
  onChange: (next: SetType) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded text-xs font-bold",
          current === "warmup" && "bg-orange-500 text-white",
          current === "failure" && "bg-red-600 text-white",
          current === "working" && "bg-neutral-100 text-neutral-700"
        )}
      >
        {current === "warmup" ? "W" : current === "failure" ? "F" : setNumber}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-8 z-20 flex gap-1 rounded border border-neutral-200 bg-white p-1 shadow-md">
            {TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => { onChange(t.key); setOpen(false) }}
                className={cn("h-7 w-7 rounded text-xs font-bold", t.cls)}
              >{t.label}</button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
