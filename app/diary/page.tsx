import { redirect } from "next/navigation"
import { getCurrentDate } from "@/lib/utils/diary-date"

export default function DiaryRootPage() {
  redirect(`/diary/${getCurrentDate()}`)
}
