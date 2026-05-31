"use client"

import { useState, useRef, useEffect, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { DeleteConfirmDialog } from "@/components/budget/settings/DeleteConfirmDialog"
import {
  addPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  movePaymentMethod,
} from "@/lib/actions/payment-methods"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type PaymentMethod = {
  id: string
  name: string
  sort_order: number
  active: boolean
}

export function PaymentMethodList({ items }: { items: PaymentMethod[] }) {
  const [adding, setAdding] = useState(false)

  return (
    <div className="rounded border border-neutral-200">
      <div className="grid grid-cols-[60px_1fr_80px_120px] gap-2 border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-500">
        <span>순서</span>
        <span>이름</span>
        <span>활성</span>
        <span className="text-right">액션</span>
      </div>

      {items.map((item, idx) => (
        <Row
          key={item.id}
          item={item}
          isFirst={idx === 0}
          isLast={idx === items.length - 1}
        />
      ))}

      <div className="border-t border-neutral-200 p-3">
        {adding ? (
          <AddForm onDone={() => setAdding(false)} />
        ) : (
          <Button size="sm" onClick={() => setAdding(true)}>
            + 결제수단 추가
          </Button>
        )}
      </div>

      {items.length === 0 && !adding ? (
        <p className="px-3 py-4 text-sm text-neutral-500">
          아직 결제수단이 없습니다.
        </p>
      ) : null}
    </div>
  )
}

function Row({
  item,
  isFirst,
  isLast,
}: {
  item: PaymentMethod
  isFirst: boolean
  isLast: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(item.name)
  const [askDelete, setAskDelete] = useState(false)
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const saveName = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error("이름은 필수")
      return
    }
    if (trimmed === item.name) {
      setEditing(false)
      return
    }
    startTransition(async () => {
      const result = await updatePaymentMethod({ id: item.id, name: trimmed })
      if (!result.ok) toast.error(result.error)
      else setEditing(false)
    })
  }

  const toggleActive = (next: boolean) => {
    startTransition(async () => {
      const result = await updatePaymentMethod({ id: item.id, active: next })
      if (!result.ok) toast.error(result.error)
    })
  }

  const move = (direction: "up" | "down") => {
    startTransition(async () => {
      const result = await movePaymentMethod({ id: item.id, direction })
      if (!result.ok) toast.error(result.error)
    })
  }

  const onConfirmDelete = () =>
    new Promise<void>((resolve) => {
      startTransition(async () => {
        const result = await deletePaymentMethod({ id: item.id })
        if (!result.ok) toast.error(result.error)
        resolve()
      })
    })

  return (
    <div
      className={cn(
        "grid grid-cols-[60px_1fr_80px_120px] items-center gap-2 border-b border-neutral-100 px-3 py-2",
        !item.active && "opacity-50"
      )}
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => move("up")}
          disabled={isFirst || pending}
          className="text-neutral-400 hover:text-neutral-700 disabled:opacity-30"
          aria-label="위로"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => move("down")}
          disabled={isLast || pending}
          className="text-neutral-400 hover:text-neutral-700 disabled:opacity-30"
          aria-label="아래로"
        >
          ↓
        </button>
      </div>

      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveName()
            if (e.key === "Escape") {
              setName(item.name)
              setEditing(false)
            }
          }}
          onBlur={saveName}
          disabled={pending}
          className="rounded border border-neutral-300 px-2 py-1 text-sm"
        />
      ) : (
        <span
          className="cursor-pointer rounded px-2 py-1 hover:bg-neutral-100"
          onClick={() => setEditing(true)}
        >
          {item.name}
        </span>
      )}

      <button
        type="button"
        onClick={() => toggleActive(!item.active)}
        disabled={pending}
        className={cn(
          "rounded-full px-2 py-1 text-xs font-medium transition-colors",
          item.active
            ? "bg-emerald-500 text-white hover:bg-emerald-600"
            : "bg-neutral-200 text-neutral-600 hover:bg-neutral-300"
        )}
        aria-label={item.active ? "활성" : "비활성"}
      >
        {item.active ? "✓ 활성" : "비활성"}
      </button>

      <div className="flex justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEditing(true)}
          aria-label="편집"
        >
          ✏️
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAskDelete(true)}
          aria-label="삭제"
        >
          🗑️
        </Button>
      </div>

      <DeleteConfirmDialog
        open={askDelete}
        onOpenChange={setAskDelete}
        title={`"${item.name}" 결제수단 삭제`}
        message="과거 거래의 텍스트는 그대로 유지됩니다. (스냅샷 패턴)"
        onConfirm={onConfirmDelete}
      />
    </div>
  )
}

function AddForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("")
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const save = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error("이름은 필수")
      return
    }
    startTransition(async () => {
      const result = await addPaymentMethod({ name: trimmed })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setName("")
      onDone()
    })
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save()
          if (e.key === "Escape") onDone()
        }}
        disabled={pending}
        className="flex-1 rounded border border-neutral-300 px-2 py-1 text-sm"
        placeholder="결제수단 이름 (예: 보라삼성)"
      />
      <Button size="sm" onClick={save} disabled={pending}>
        {pending ? "추가 중..." : "추가"}
      </Button>
      <Button size="sm" variant="outline" onClick={onDone} disabled={pending}>
        취소
      </Button>
    </div>
  )
}
