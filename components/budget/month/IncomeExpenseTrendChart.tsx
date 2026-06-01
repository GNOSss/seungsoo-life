"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"
import { parseYm } from "@/lib/utils/ym"

const krwFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
})

const krwCompactFormatter = new Intl.NumberFormat("ko-KR", {
  notation: "compact",
  maximumFractionDigits: 1,
})

export type TrendDatum = {
  year_month: string
  income: number
  expense: number
}

export function IncomeExpenseTrendChart({ data }: { data: TrendDatum[] }) {
  const chartData = data.map((d) => ({
    ...d,
    label: `${parseYm(d.year_month).month}월`,
  }))

  const hasAnyData = chartData.some((d) => d.income > 0 || d.expense > 0)

  if (!hasAnyData) {
    return (
      <div className="rounded border border-neutral-200 p-4 text-center text-sm text-neutral-500">
        최근 6개월 데이터가 없습니다
      </div>
    )
  }

  return (
    <div className="rounded border border-neutral-200 p-3 md:p-4">
      <p className="mb-2 text-xs font-medium text-neutral-500">
        최근 6개월 입금 vs 출금
      </p>
      <div className="h-[220px] md:h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 8, bottom: 0, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
            <XAxis
              dataKey="label"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: "#e5e5e5" }}
            />
            <YAxis
              fontSize={11}
              tickFormatter={(v) => krwCompactFormatter.format(v as number)}
              tickLine={false}
              axisLine={false}
              width={50}
            />
            <Tooltip
              formatter={(v, name) => [
                typeof v === "number" ? krwFormatter.format(v) : String(v),
                name === "income" ? "입금" : "출금",
              ]}
              labelFormatter={(label) => `${label}`}
              contentStyle={{
                fontSize: "12px",
                borderRadius: "6px",
                border: "1px solid #e5e5e5",
              }}
            />
            <Legend
              formatter={(value) => (value === "income" ? "입금" : "출금")}
              wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
            />
            <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
