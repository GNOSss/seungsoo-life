import { addSet, findPreviousSet } from "@/lib/actions/workout-sets"
import { removeExerciseFromSession } from "@/lib/actions/workout-sessions"
import { SetRow, type SetRowData } from "./SetRow"

export async function ExerciseBlock({
  sessionExercise,
  sets,
  sessionId,
}: {
  sessionExercise: { id: string; exercise_name: string; body_part: string }
  sets: SetRowData[]
  sessionId: string
}) {
  // 각 세트의 직전 기록 fetch
  const prevs = await Promise.all(
    sets.map((s) =>
      findPreviousSet(sessionExercise.exercise_name, s.set_number, sessionId)
    )
  )

  async function addSetAction() {
    "use server"
    await addSet(sessionExercise.id, sessionId)
  }

  async function removeExAction() {
    "use server"
    await removeExerciseFromSession(sessionExercise.id, sessionId)
  }

  return (
    <section className="space-y-1.5 rounded border border-neutral-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{sessionExercise.exercise_name}</h3>
        <form action={removeExAction}>
          <button className="text-xs text-red-600 hover:underline">운동 삭제</button>
        </form>
      </div>
      <div className="grid grid-cols-[40px_60px_1fr_1fr_40px_24px] items-center gap-1 px-1 text-[10px] uppercase text-neutral-400">
        <div>세트</div><div>이전</div><div className="text-center">kg</div><div className="text-center">렙</div><div></div><div></div>
      </div>
      <div className="space-y-1">
        {sets.map((s, i) => (
          <SetRow key={s.id} set={s} prev={prevs[i]} sessionId={sessionId} />
        ))}
      </div>
      <form action={addSetAction}>
        <button className="w-full rounded border border-dashed border-neutral-300 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50">
          + 세트 추가
        </button>
      </form>
    </section>
  )
}
