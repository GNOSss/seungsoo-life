import { createClient } from "@/lib/supabase/server"
import { RoutineCard } from "./RoutineCard"

export async function TemplateFolderList() {
  const supabase = await createClient()
  const { data: folders } = await supabase
    .from("workout_template_folders")
    .select("id, name, sort_order")
    .order("sort_order", { ascending: true })

  const { data: routines } = await supabase
    .from("workout_routines")
    .select("id, name, folder_id, sort_order")
    .order("sort_order", { ascending: true })

  const { data: rxn } = await supabase
    .from("workout_routine_exercises")
    .select("routine_id")

  const exerciseCount = new Map<string, number>()
  for (const r of rxn ?? []) {
    exerciseCount.set(r.routine_id, (exerciseCount.get(r.routine_id) ?? 0) + 1)
  }

  if (!folders || folders.length === 0) {
    return (
      <div className="rounded border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
        템플릿 폴더가 없습니다. <a href="/workout/templates" className="text-blue-600 underline">템플릿 만들기</a>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {folders.map((folder) => {
        const folderRoutines = (routines ?? []).filter((r) => r.folder_id === folder.id)
        return (
          <div key={folder.id}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {folder.name} ({folderRoutines.length})
            </h3>
            <div className="space-y-1.5">
              {folderRoutines.map((r) => (
                <RoutineCard
                  key={r.id}
                  routine={{ id: r.id, name: r.name, exerciseCount: exerciseCount.get(r.id) ?? 0 }}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
