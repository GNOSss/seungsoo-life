"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"

const COLORS = [
  "#10b981", // emerald
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#84cc16", // lime
  "#f97316", // orange
  "#14b8a6", // teal
]

const krwFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
})

export type CategoryDatum = { category: string; amount: number }

export function ExpenseByCategoryChart({ data }: { data: CategoryDatum[] }) {
  const total = data.reduce((sum, d) => sum + d.amount, 0)

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
            return (
              <li
                key={d.category}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-3 shrink-0 rounded-sm"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="truncate">{d.category}</span>
                </div>
                <span className="shrink-0 text-neutral-500 tabular-nums">
                  {pct.toFixed(1)}% · {krwFormatter.format(d.amount)}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
