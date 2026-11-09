"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { addTodoItem } from "@/lib/actions/diary-todo-items"
import type { TodoItemKind } from "@/lib/validators/diary-todo-items"
import { toast } from "sonner"

export function TodoAddRow({ kind }: { kind: TodoItemKind }) {
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState("")
  const [pending, startTransition] = useTransition()

  const save = () => {
    const trimmed = title.trim()
    if (!trimmed) return
    startTransition(async () => {
      const result = await addTodoItem({
        kind,
        importance: "mid",
        title: trimmed,
        sort_order: Date.now(),
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setTitle("")
    })
  }

  if (!adding) {
    return (
      <div className="px-2 py-2">
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          + 새 항목
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-2 py-2">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save()
        }}
        disabled={pending}
        placeholder="항목 입력"
        className="flex-1 rounded border border-neutral-300 px-2 py-1 text-sm"
      />
      <Button size="sm" onClick={save} disabled={pending || title.trim().length === 0}>
        추가
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          setTitle("")
          setAdding(false)
        }}
        disabled={pending}
      >
        완료
      </Button>
    </div>
  )
}
