import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { isValidYm, formatYmKorean } from "@/lib/utils/ym"
import { CreateMonthButton } from "@/components/budget/sidebar/CreateMonthButton"

export default async function MonthPage({
  params,
}: {
  params: { ym: string }
}) {
  if (!isValidYm(params.ym)) notFound()

  const supabase = await createClient()
  const { data: summary } = await supabase
    .from("monthly_summaries")
    .select("year_month")
    .eq("year_month", params.ym)
    .maybeSingle()

  if (!summary) {
    return <NoMonthYet ym={params.ym} />
  }

  return <MonthHeader ym={params.ym} />
}

function MonthHeader({ ym }: { ym: string }) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">{formatYmKorean(ym)}</h1>
      <p className="mt-4 text-sm text-neutral-500">
        거래 입력은 다음 Phase에서 추가됩니다.
      </p>
    </div>
  )
}

function NoMonthYet({ ym }: { ym: string }) {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h1 className="text-2xl font-bold">{formatYmKorean(ym)}</h1>
      <p className="mt-4 text-sm text-neutral-500">
        이 월은 아직 생성되지 않았습니다.
      </p>
      <div className="mt-6">
        <CreateMonthButton ym={ym} label="이 월 생성" variant="primary" />
      </div>
    </div>
  )
}
