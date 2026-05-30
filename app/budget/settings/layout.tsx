import Link from "next/link"
import { SettingsSubNav } from "@/components/budget/settings/SettingsSubNav"

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Link
        href="/budget"
        className="text-sm text-neutral-500 hover:text-neutral-900"
      >
        ← 가계부로 돌아가기
      </Link>
      <h1 className="mt-4 text-2xl font-bold">⚙️ 설정</h1>
      <div className="mt-6">
        <SettingsSubNav />
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}
