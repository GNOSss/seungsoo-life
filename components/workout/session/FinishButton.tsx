"use client"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { finishSession, deleteSession } from "@/lib/actions/workout-sessions"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function FinishButton({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()

  const onFinish = () =>
    start(async () => {
      if (!confirm("운동을 완료하시겠습니까?")) return
      const r = await finishSession(sessionId)
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      if (r.data?.discarded) {
        toast.info("완료된 세트가 없어 저장하지 않았습니다.")
        router.push("/workout/start")
        return
      }
      router.push(`/workout/session/${sessionId}/complete`)
    })

  const onDelete = () =>
    start(async () => {
      if (!confirm("이 워크아웃을 삭제하시겠습니까?")) return
      const r = await deleteSession(sessionId)
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success("삭제됐습니다.")
      router.push("/workout/start")
    })

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onDelete}
        disabled={pending}
        className="text-red-600 hover:bg-red-50 hover:text-red-700"
      >
        삭제
      </Button>
      <Button onClick={onFinish} disabled={pending} className="bg-green-600 hover:bg-green-700">
        {pending ? "완료 중..." : "완료"}
      </Button>
    </div>
  )
}
