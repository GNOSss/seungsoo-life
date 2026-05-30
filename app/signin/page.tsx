"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

function SigninForm() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const error = searchParams.get("error")
    if (error) toast.error(`로그인 실패: ${error}`)
  }, [searchParams])

  const handleSignIn = async () => {
    setLoading(true)
    const next = searchParams.get("next") ?? "/budget"
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
    if (error) {
      toast.error(`로그인 실패: ${error.message}`)
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6 rounded-lg border border-neutral-200 p-8 text-center">
      <div>
        <h1 className="text-2xl font-bold">승수 라이프</h1>
        <p className="mt-2 text-sm text-neutral-500">
          일상의 반복 작업을 모두 하나의 통합 PWA로
        </p>
      </div>
      <Button onClick={handleSignIn} disabled={loading} className="w-full">
        {loading ? "이동 중..." : "Google로 로그인"}
      </Button>
    </div>
  )
}

export default function SigninPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Suspense fallback={null}>
        <SigninForm />
      </Suspense>
    </div>
  )
}
