"use client"

import { useState, useTransition } from "react"
import { Drawer } from "vaul"
import { Button } from "@/components/ui/button"
import { upsertActivityColorByName } from "@/lib/actions/diary-activities"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const DEFAULT_PALETTE = [
  "#F5A623",
  "#E91E63",
  "#4A4A4A",
  "#7B68EE",
  "#F8E71C",
  "#D0021B",
  "#4FC3F7",
  "#D8D8D8",
]

export function ColorPalette({
  open,
  onClose,
  activityName,
  currentColor,
  paletteColors,
  date,
}: {
  open: boolean
  onClose: () => void
  activityName: string
  currentColor: string
  paletteColors: { name: string; color: string }[]
  date: string
}) {
  const [pending, startTransition] = useTransition()
  const [customColor, setCustomColor] = useState(currentColor)

  const allColors = Array.from(
    new Set([...paletteColors.map((c) => c.color), ...DEFAULT_PALETTE])
  )

  const apply = (color: string) => {
    startTransition(async () => {
      const result = await upsertActivityColorByName({
        name: activityName,
        color,
        date,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("적용됨 — 라이브러리에 저장")
      onClose()
    })
  }

  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mx-auto flex max-h-[70vh] max-w-md flex-col rounded-t-xl border-t border-neutral-200 bg-white">
          <div className="mx-auto mt-2 h-1 w-12 shrink-0 rounded-full bg-neutral-300" />
          <Drawer.Title className="px-4 pt-3 text-base font-semibold">
            색 선택 — {activityName}
          </Drawer.Title>

          <div
            className="flex-1 space-y-4 overflow-y-auto px-4 py-3"
            data-vaul-no-drag
          >
            <div>
              <p className="mb-2 text-xs text-neutral-500">팔레트</p>
              <div className="grid grid-cols-8 gap-2">
                {allColors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => apply(c)}
                    disabled={pending}
                    aria-label={c}
                    className={cn(
                      "size-9 rounded-full border-2 transition-transform hover:scale-110",
                      c === currentColor
                        ? "border-neutral-900 ring-2 ring-offset-1"
                        : "border-white"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs text-neutral-500">
                커스텀 색 (#RRGGBB)
              </p>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  disabled={pending}
                  className="h-9 w-16 rounded border border-neutral-300"
                />
                <input
                  type="text"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  disabled={pending}
                  className="flex-1 rounded border border-neutral-300 px-2 font-mono text-sm uppercase"
                />
                <Button
                  onClick={() => apply(customColor)}
                  disabled={pending || !/^#[0-9a-fA-F]{6}$/.test(customColor)}
                >
                  적용
                </Button>
              </div>
            </div>
          </div>

          <div
            className="flex shrink-0 gap-2 border-t border-neutral-100 px-4 py-3"
            data-vaul-no-drag
          >
            <Button
              variant="outline"
              onClick={onClose}
              disabled={pending}
              className="flex-1"
            >
              닫기
            </Button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
