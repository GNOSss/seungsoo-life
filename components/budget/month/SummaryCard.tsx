import { cn } from "@/lib/utils"

const krwFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
})

export function SummaryCard({
  label,
  amount,
  hero = false,
}: {
  label: string
  amount: number
  hero?: boolean
}) {
  const isNegative = amount < 0

  return (
    <div
      className={cn(
        "rounded border border-neutral-200",
        hero ? "p-4" : "p-3"
      )}
    >
      <p className={cn("text-neutral-500", hero ? "text-sm" : "text-xs")}>
        {label}
      </p>
      <p
        className={cn(
          "mt-1 tabular-nums",
          hero ? "text-lg font-semibold" : "text-sm font-medium",
          isNegative ? "text-red-600" : "text-neutral-900"
        )}
      >
        {krwFormatter.format(amount)}
      </p>
    </div>
  )
}
