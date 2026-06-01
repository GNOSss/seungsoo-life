import { createClient } from "@/lib/supabase/server"
import { QuestsList } from "@/components/diary/settings/QuestsList"

export default async function DiaryQuestsPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("diary_quests")
    .select("id, name, active")
    .order("sort_order", { ascending: true })

  if (error)
    return <p className="text-sm text-red-600">에러: {error.message}</p>

  return (
    <div className="rounded border border-neutral-200">
      <div className="grid grid-cols-[60px_1fr_40px] gap-2 border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-500">
        <span>활성</span>
        <span>Quest 이름</span>
        <span />
      </div>
      <QuestsList rows={data ?? []} />
    </div>
  )
}
