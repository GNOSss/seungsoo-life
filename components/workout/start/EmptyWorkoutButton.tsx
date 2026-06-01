"use client"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { startEmptySession } from "@/lib/actions/workout-sessions"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function EmptyWorkoutButton() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const onClick = () =>
    start(async () => {
      const result = await startEmptySession()
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      router.push(`/workout/session/${result.id}`)
    })
  return (
    <Button
      onClick={onClick}
      disabled={pending}
      className="h-14 w-full bg-blue-600 text-base font-semibold hover:bg-blue-700"
    >
      {pending ? "시작 중..." : "+ 빈 워크아웃 시작"}
    </Button>
  )
}
