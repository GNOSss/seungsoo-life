import { cn } from "@/lib/utils"

const krwFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
})

export function SummaryCard({
  label,
  amount,
}: {
  label: string
  amount: number
}) {
  const isNegative = amount < 0

  return (
    <div className="rounded border border-neutral-200 p-3">
      <p className="text-xs text-neutral-500">{label}</p>
      <p
        className={cn(
          "mt-1 text-sm font-medium",
          isNegative ? "text-red-600" : "text-neutral-900"
        )}
      >
        {krwFormatter.format(amount)}
      </p>
    </div>
  )
}
