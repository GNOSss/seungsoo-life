"use client"

import { useRef, useState } from "react"
import { cn } from "@/lib/utils"
import {
  ExpenseByCategoryChart,
  type CategoryDatum,
} from "@/components/budget/month/ExpenseByCategoryChart"
import {
  IncomeExpenseTrendChart,
  type TrendDatum,
} from "@/components/budget/month/IncomeExpenseTrendChart"

export function ChartsCarousel({
  expenseByCategory,
  trend,
}: {
  expenseByCategory: CategoryDatum[]
  trend: TrendDatum[]
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [idx, setIdx] = useState(0)
  const total = 2

  const scrollTo = (i: number) => {
    if (!scrollRef.current) return
    const width = scrollRef.current.clientWidth
    scrollRef.current.scrollTo({ left: width * i, behavior: "smooth" })
    setIdx(i)
  }

  const onScroll = () => {
    if (!scrollRef.current) return
    const width = scrollRef.current.clientWidth
    const newIdx = Math.round(scrollRef.current.scrollLeft / width)
    if (newIdx !== idx) setIdx(newIdx)
  }

  return (
    <>
      {/* xl+ : 좌우 2열 */}
      <div className="hidden gap-4 xl:grid xl:grid-cols-2">
        <ExpenseByCategoryChart data={expenseByCategory} />
        <IncomeExpenseTrendChart data={trend} />
      </div>

      {/* < xl : 스크롤·스와이프 + (md+ 일 때만) 좌우 버튼 */}
      <div className="xl:hidden">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="snap-center shrink-0 basis-full">
            <ExpenseByCategoryChart data={expenseByCategory} />
          </div>
          <div className="snap-center shrink-0 basis-full">
            <IncomeExpenseTrendChart data={trend} />
          </div>
        </div>

        {/* 인디케이터 + 좌우 버튼 (md+) */}
        <div className="mt-2 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => scrollTo(idx - 1)}
            disabled={idx === 0}
            aria-label="이전 차트"
            className="hidden size-8 items-center justify-center rounded-full border border-neutral-200 text-neutral-600 hover:bg-neutral-100 disabled:opacity-30 md:flex"
          >
            ←
          </button>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: total }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollTo(i)}
                aria-label={`차트 ${i + 1}`}
                className={cn(
                  "size-2 rounded-full transition-colors",
                  i === idx ? "bg-neutral-700" : "bg-neutral-300"
                )}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => scrollTo(idx + 1)}
            disabled={idx === total - 1}
            aria-label="다음 차트"
            className="hidden size-8 items-center justify-center rounded-full border border-neutral-200 text-neutral-600 hover:bg-neutral-100 disabled:opacity-30 md:flex"
          >
            →
          </button>
        </div>
      </div>
    </>
  )
}
