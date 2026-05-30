"use client"

import { useState, useRef, useEffect, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { addCategory, updateCategory } from "@/lib/actions/categories"
import { toast } from "sonner"

type Mode = "view" | "edit" | "add"

export function CategoryRowForm({
  category,
  type,
  parentId,
  onEnterEdit,
  onCancel,
  onAskDelete,
}: {
  category?: { id: string; name: string }
  type: "income" | "expense"
  parentId: string | null
  onEnterEdit?: () => void
  onCancel?: () => void
  onAskDelete?: () => void
}) {
  const initialMode: Mode = category ? "view" : "add"
  const [mode, setMode] = useState<Mode>(initialMode)
  const [name, setName] = useState(category?.name ?? "")
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (mode === "edit" || mode === "add") inputRef.current?.focus()
  }, [mode])

  const save = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error("이름은 필수")
      return
    }
    startTransition(async () => {
      const result =
        mode === "add"
          ? await addCategory({ name: trimmed, type, parent_id: parentId })
          : await updateCategory({ id: category!.id, name: trimmed })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      if (mode === "add") {
        setName("")
        onCancel?.()
      } else {
        setMode("view")
      }
    })
  }

  const cancel = () => {
    setName(category?.name ?? "")
    if (mode === "edit") setMode("view")
    else onCancel?.()
  }

  if (mode === "view" && category) {
    return (
      <div className="flex items-center gap-2 py-1">
        <span
          className="flex-1 cursor-pointer rounded px-2 py-1 hover:bg-neutral-100"
          onClick={() => {
            setMode("edit")
            onEnterEdit?.()
          }}
        >
          {category.name}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setMode("edit")
            onEnterEdit?.()
          }}
          aria-label="편집"
        >
          ✏️
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAskDelete?.()}
          aria-label="삭제"
        >
          🗑️
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 py-1">
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save()
          if (e.key === "Escape") cancel()
        }}
        onBlur={save}
        disabled={pending}
        className="flex-1 rounded border border-neutral-300 px-2 py-1 text-sm"
        placeholder="카테고리 이름"
      />
      <Button size="sm" onClick={save} disabled={pending}>
        {pending ? "저장 중..." : mode === "add" ? "추가" : "저장"}
      </Button>
      <Button size="sm" variant="outline" onClick={cancel} disabled={pending}>
        취소
      </Button>
    </div>
  )
}
