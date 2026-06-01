"use client"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { finishSession } from "@/lib/actions/workout-sessions"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function FinishButton({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const onClick = () =>
    start(async () => {
      if (!confirm("운동을 완료하시겠습니까?")) return
      const r = await finishSession(sessionId)
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      router.push(`/workout/session/${sessionId}/complete`)
    })
  return (
    <Button onClick={onClick} disabled={pending} className="bg-green-600 hover:bg-green-700">
      {pending ? "완료 중..." : "완료"}
    </Button>
  )
}
