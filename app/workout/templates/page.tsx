import { createClient } from "@/lib/supabase/server"
import { FolderEditor } from "@/components/workout/templates/FolderEditor"
import { createFolder } from "@/lib/actions/workout-templates"
import type { RoutineExerciseRow } from "@/components/workout/templates/RoutineEditor"

async function newFolderAction(formData: FormData) {
  "use server"
  const name = String(formData.get("name") ?? "").trim()
  if (!name) return
  await createFolder({ name })
}

export default async function Page() {
  const supabase = await createClient()
  const [foldersRes, routinesRes, exercisesRes, rxnRes] = await Promise.all([
    supabase.from("workout_template_folders").select("id, name").order("sort_order", { ascending: true }),
    supabase.from("workout_routines").select("id, name, folder_id").order("sort_order", { ascending: true }),
    supabase.from("workout_exercises").select("id, name").order("name", { ascending: true }),
    supabase
      .from("workout_routine_exercises")
      .select("id, routine_id, exercise_id, default_sets, sort_order, workout_exercises!inner(name)")
      .order("sort_order", { ascending: true }),
  ])

  const folders = foldersRes.data ?? []
  const routines = routinesRes.data ?? []
  const exercises = exercisesRes.data ?? []
  const rxn = rxnRes.data ?? []

  const routineExercisesByRoutine: Record<string, RoutineExerciseRow[]> = {}
  for (const r of rxn) {
    const joined = r.workout_exercises as { name: string } | Array<{ name: string }>
    const exName = Array.isArray(joined) ? (joined[0]?.name ?? "") : (joined?.name ?? "")
    if (!routineExercisesByRoutine[r.routine_id]) routineExercisesByRoutine[r.routine_id] = []
    routineExercisesByRoutine[r.routine_id].push({
      id: r.id,
      exercise_id: r.exercise_id,
      exercise_name: exName,
      default_sets: r.default_sets,
    })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <h1 className="text-xl font-bold md:text-2xl">📋 템플릿</h1>
      <form action={newFolderAction} className="flex gap-1.5">
        <input
          name="name"
          placeholder="새 폴더 이름"
          className="flex-1 rounded border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <button className="rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700">+ 폴더</button>
      </form>
      {folders.length === 0 ? (
        <p className="rounded border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
          폴더가 없습니다.
        </p>
      ) : (
        <div className="space-y-3">
          {folders.map((f) => (
            <FolderEditor
              key={f.id}
              folder={f}
              routines={routines.filter((r) => r.folder_id === f.id)}
              exercises={exercises}
              routineExercisesByRoutine={routineExercisesByRoutine}
            />
          ))}
        </div>
      )}
    </div>
  )
}
