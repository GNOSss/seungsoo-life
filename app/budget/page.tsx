import { redirect } from "next/navigation"
import { getCurrentYm } from "@/lib/utils/ym"

export default function BudgetPage() {
  redirect(`/budget/${getCurrentYm()}`)
}
