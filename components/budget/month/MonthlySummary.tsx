import { SummaryCard } from "@/components/budget/month/SummaryCard"

export type MonthlySummaryData = {
  opening_balance: number
  income_total: number
  expense_total: number
  paid_total: number
  unpaid_total: number
  current_balance: number
  expected_balance: number
}

const DESKTOP_CARDS: { label: string; key: keyof MonthlySummaryData }[] = [
  { label: "전월 잔고", key: "opening_balance" },
  { label: "입금 총액", key: "income_total" },
  { label: "출금 총액", key: "expense_total" },
  { label: "실제 출금", key: "paid_total" },
  { label: "남은 출금", key: "unpaid_total" },
  { label: "현재 잔고", key: "current_balance" },
  { label: "예상 잔고", key: "expected_balance" },
]

const HERO_KEY: keyof MonthlySummaryData = "expected_balance"
const HERO_CARD = DESKTOP_CARDS.find((c) => c.key === HERO_KEY)!
const MOBILE_GRID_CARDS = DESKTOP_CARDS.filter((c) => c.key !== HERO_KEY)

export function MonthlySummary({ summary }: { summary: MonthlySummaryData }) {
  return (
    <>
      {/* Mobile: Hero + 2col grid */}
      <div className="space-y-2 md:hidden">
        <SummaryCard
          label={HERO_CARD.label}
          amount={Number(summary[HERO_KEY])}
          hero
        />
        <div className="grid grid-cols-2 gap-2">
          {MOBILE_GRID_CARDS.map((card) => (
            <SummaryCard
              key={card.key}
              label={card.label}
              amount={Number(summary[card.key])}
            />
          ))}
        </div>
      </div>

      {/* Desktop: 7col single row */}
      <div className="hidden gap-2 md:grid md:grid-cols-7">
        {DESKTOP_CARDS.map((card) => (
          <SummaryCard
            key={card.key}
            label={card.label}
            amount={Number(summary[card.key])}
          />
        ))}
      </div>
    </>
  )
}
