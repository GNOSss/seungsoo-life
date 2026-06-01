import { createClient } from "@/lib/supabase/server"
import { ActivitiesList } from "@/components/diary/settings/ActivitiesList"

export default async function DiaryActivitiesPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("diary_activities")
    .select("id, name, color")
    .order("sort_order", { ascending: true })

  if (error)
    return <p className="text-sm text-red-600">에러: {error.message}</p>

  return (
    <div className="rounded border border-neutral-200">
      <div className="grid grid-cols-[60px_1fr_100px_40px] gap-2 border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-500">
        <span>색</span>
        <span>키워드 (콤마 구분)</span>
        <span>HEX</span>
        <span />
      </div>
      <ActivitiesList rows={data ?? []} />
    </div>
  )
}
