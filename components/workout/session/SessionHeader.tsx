"use client"
import { useEffect, useState } from "react"

export function SessionHeader({
  title,
  date,
  startedAt,
}: {
  title: string
  date: string
  startedAt: string
}) {
  const [elapsed, setElapsed] = useState("")
  useEffect(() => {
    const update = () => {
      const ms = Date.now() - new Date(startedAt).getTime()
      const totalSec = Math.max(0, Math.floor(ms / 1000))
      const h = Math.floor(totalSec / 3600)
      const m = Math.floor((totalSec % 3600) / 60)
      const s = totalSec % 60
      setElapsed(h > 0 ? `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}` : `${m}:${String(s).padStart(2,"0")}`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [startedAt])

  return (
    <div>
      <h1 className="text-lg font-bold">{title}</h1>
      <p className="text-xs text-neutral-500">📅 {date} · 🕐 {elapsed}</p>
    </div>
  )
}
