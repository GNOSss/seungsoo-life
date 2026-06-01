import { createClient } from "@/lib/supabase/server"
import { ExerciseRow } from "./ExerciseRow"
import { NewExerciseDialog } from "./NewExerciseDialog"
import { Button } from "@/components/ui/button"

export async function ExerciseList() {
  const supabase = await createClient()
  const { data: rows } = await supabase
    .from("workout_exercises")
    .select("id, name, body_part, category")
    .order("body_part", { ascending: true })
    .order("name", { ascending: true })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold md:text-2xl">운동 종목</h1>
        <NewExerciseDialog trigger={<Button size="sm">+ 새 운동</Button>} />
      </div>
      {!rows || rows.length === 0 ? (
        <p className="rounded border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
          등록된 운동이 없습니다.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((ex) => <ExerciseRow key={ex.id} ex={ex} />)}
        </ul>
      )}
    </div>
  )
}
