import { redirect } from "next/navigation"
import { getCurrentDate, getMondayOf } from "@/lib/utils/diary-date"

export default function DiaryRootPage() {
  redirect(`/diary/week/${getMondayOf(getCurrentDate())}`)
}
