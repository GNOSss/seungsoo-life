"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { createNextMonth } from "@/lib/actions/budget-months"
import { toast } from "sonner"

export function CreateMonthButton({
  ym,
  label,
  variant = "sidebar",
}: {
  ym: string
  label: string
  variant?: "sidebar" | "primary"
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const handleClick = () => {
    startTransition(async () => {
      const result = await createNextMonth({ ym })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      router.push(`/budget/${ym}`)
    })
  }

  if (variant === "primary") {
    return (
      <Button onClick={handleClick} disabled={pending} size="lg">
        {pending ? "생성 중..." : label}
      </Button>
    )
  }

  // sidebar variant
  return (
    <Button
      onClick={handleClick}
      disabled={pending}
      variant="outline"
      size="sm"
      className="w-full"
    >
      {pending ? "생성 중..." : label}
    </Button>
  )
}
