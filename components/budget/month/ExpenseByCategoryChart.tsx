"use client"

import { useState, useRef, useCallback } from "react"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"

const COLORS = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#f97316",
  "#14b8a6",
]

const krwFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
})

export type CategoryDatum = {
  category: string
  amount: number
  subcategories?: { category: string; amount: number }[]
}

function BubbleContent({
  data,
  total,
  color,
}: {
  data: { category: string; amount: number }[]
  total: number
  color: string
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-2.5 shadow-lg">
      <div className="mb-1.5 text-[10px] font-semibold" style={{ color }}>
        2차 카테고리
      </div>
      <ul className="space-y-1">
        {data.map((d) => (
          <li key={d.category} className="flex items-center justify-between gap-3 text-xs">
            <span className="truncate text-neutral-700">{d.category}</span>
            <span className="shrink-0 tabular-nums text-neutral-500">
              {((d.amount / total) * 100).toFixed(0)}%&nbsp;·&nbsp;{krwFormatter.format(d.amount)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SubcategoryBubble({
  data,
  total,
  color,
  mobileDir,
}: {
  data: { category: string; amount: number }[]
  total: number
  color: string
  mobileDir: "above" | "below"
}) {
  return (
    <>
      {/* 모바일: 위/아래 동적 방향 */}
      <div
        className={`absolute left-0 z-50 w-full md:hidden ${
          mobileDir === "below" ? "top-full mt-1" : "bottom-full mb-1"
        }`}
      >
        {mobileDir === "below" ? (
          /* 위쪽 꼬리 (bubble이 아래에 있을 때) */
          <div
            className="ml-3 border-x-[6px] border-b-[7px] border-x-transparent"
            style={{ borderBottomColor: "#f5f5f5" }}
          />
        ) : (
          /* 아래쪽 꼬리 (bubble이 위에 있을 때) */
          <div
            className="ml-3 border-x-[6px] border-t-[7px] border-x-transparent"
            style={{ borderTopColor: "#f5f5f5" }}
          />
        )}
        <BubbleContent data={data} total={total} color={color} />
      </div>

      {/* PC: 오른쪽 고정 */}
      <div className="absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 md:block">
        <div
          className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 border-y-[6px] border-r-[7px] border-y-transparent"
          style={{ borderRightColor: "#f5f5f5" }}
        />
        <div className="min-w-[160px]">
          <BubbleContent data={data} total={total} color={color} />
        </div>
      </div>
    </>
  )
}

export function ExpenseByCategoryChart({ data }: { data: CategoryDatum[] }) {
  const total = data.reduce((sum, d) => sum + d.amount, 0)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [mobileDir, setMobileDir] = useState<"above" | "below">("below")
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback((i: number) => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setActiveIndex(i)
  }, [])

  const hide = useCallback(() => {
    hideTimer.current = setTimeout(() => setActiveIndex(null), 120)
  }, [])

  const handleTouch = useCallback(
    (e: React.TouchEvent<HTMLLIElement>, i: number, subLen: number) => {
      e.preventDefault()
      if (activeIndex === i) {
        setActiveIndex(null)
        return
      }
      // 항목 아래 남은 공간 추정: 행 ~24px + 헤더 20px + 패딩 20px
      const estimatedBubbleH = subLen * 24 + 40
      const rect = e.currentTarget.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      setMobileDir(spaceBelow >= estimatedBubbleH ? "below" : "above")
      setActiveIndex(i)
    },
    [activeIndex]
  )

  if (total === 0) {
    return (
      <div className="rounded border border-neutral-200 p-4 text-center text-sm text-neutral-500">
        이번 달 지출 없음
      </div>
    )
  }

  return (
    <div className="rounded border border-neutral-200 p-3 md:p-4">
      <p className="mb-2 text-xs font-medium text-neutral-500">
        1차 카테고리 지출 비율
      </p>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
        <div className="h-[180px] md:h-[220px] md:w-1/2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="amount"
                nameKey="category"
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="90%"
                paddingAngle={2}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v) =>
                  typeof v === "number" ? krwFormatter.format(v) : String(v)
                }
                contentStyle={{
                  fontSize: "12px",
                  borderRadius: "6px",
                  border: "1px solid #e5e5e5",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="space-y-1 text-sm md:flex-1">
          {data.map((d, i) => {
            const pct = (d.amount / total) * 100
            const hasSub = (d.subcategories?.length ?? 0) > 0
            const isActive = activeIndex === i
            const color = COLORS[i % COLORS.length]

            return (
              <li
                key={d.category}
                className="relative flex cursor-default items-center justify-between gap-2 rounded px-1 py-0.5 transition-colors hover:bg-neutral-100"
                onMouseEnter={() => hasSub && show(i)}
                onMouseLeave={() => hasSub && hide()}
                onTouchEnd={(e) => {
                  if (!hasSub) return
                  handleTouch(e, i, d.subcategories!.length)
                }}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-3 shrink-0 rounded-sm"
                    style={{ backgroundColor: color }}
                  />
                  <span className="truncate">{d.category}</span>
                  {hasSub && (
                    <span className="text-[10px] text-neutral-400">▸</span>
                  )}
                </div>
                <span className="shrink-0 text-neutral-500 tabular-nums">
                  {pct.toFixed(1)}% · {krwFormatter.format(d.amount)}
                </span>

                {isActive && hasSub && (
                  <SubcategoryBubble
                    data={d.subcategories!}
                    total={d.amount}
                    color={color}
                    mobileDir={mobileDir}
                  />
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
