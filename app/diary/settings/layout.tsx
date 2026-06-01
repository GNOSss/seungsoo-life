import Link from "next/link"

export default function DiarySettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4 p-3 md:space-y-6 md:p-6">
      <p className="text-xs text-neutral-500">
        <Link href="/diary" className="hover:underline">
          ← 일기로 돌아가기
        </Link>
      </p>
      <h1 className="text-xl font-bold md:text-2xl">⚙️ 일기장 설정</h1>
      <nav className="flex gap-3 border-b border-neutral-200 pb-2 text-sm">
        <Link href="/diary/settings/activities" className="hover:underline">
          활동 라이브러리
        </Link>
        <Link href="/diary/settings/quests" className="hover:underline">
          Daily Quest
        </Link>
      </nav>
      {children}
    </div>
  )
}
