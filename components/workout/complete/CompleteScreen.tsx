import Link from "next/link"
import { Button } from "@/components/ui/button"
import { formatDuration, formatWeight } from "@/lib/utils/workout-format"

type BestSet = { exercise_name: string; weight_kg: number | null; reps: number | null; set_count: number }

export function CompleteScreen({
  workoutNumber,
  routineName,
  date,
  durationMinutes,
  totalWeightKg,
  prCount,
  bestSets,
}: {
  workoutNumber: number
  routineName: string
  date: string
  durationMinutes: number | null
  totalWeightKg: number
  prCount: number
  bestSets: BestSet[]
}) {
  return (
    <div className="mx-auto max-w-md space-y-6 p-4 text-center md:p-6">
      <div className="text-3xl">⭐⭐⭐</div>
      <h1 className="text-xl font-bold">잘 하셨습니다!</h1>
      <p className="text-sm text-neutral-600">이것은 회원님의 <strong>{workoutNumber}번째</strong> 워크아웃입니다!</p>

      <div className="rounded-lg border border-neutral-200 bg-white p-4 text-left">
        <h2 className="text-base font-semibold">{routineName}</h2>
        <p className="mt-1 text-xs text-neutral-500">{date}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[10px] text-neutral-400">⏱ 시간</div>
            <div className="text-sm font-semibold">{formatDuration(durationMinutes)}</div>
          </div>
          <div>
            <div className="text-[10px] text-neutral-400">🏋️ 총 무게</div>
            <div className="text-sm font-semibold">{formatWeight(totalWeightKg)}</div>
          </div>
          <div>
            <div className="text-[10px] text-neutral-400">🏆 PR</div>
            <div className="text-sm font-semibold">{prCount}</div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4 text-left">
        <h3 className="mb-2 text-xs font-semibold uppercase text-neutral-500">운동 · 최고 세트</h3>
        <ul className="space-y-1.5 text-sm">
          {bestSets.map((b, i) => (
            <li key={i} className="flex justify-between">
              <span>{b.set_count} × {b.exercise_name}</span>
              <span className="text-neutral-600">
                {b.weight_kg != null && b.reps != null
                  ? `${b.weight_kg}kg × ${b.reps}`
                  : b.reps != null
                    ? `${b.reps}렙`
                    : "-"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <Link href="/workout/start">
        <Button className="w-full">처음으로</Button>
      </Link>
    </div>
  )
}
