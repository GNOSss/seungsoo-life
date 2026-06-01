import { DiarySidebar } from "@/components/diary/sidebar/DiarySidebar"

export default function DiaryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex">
      <DiarySidebar />
      <main className="min-h-screen flex-1 md:ml-0">{children}</main>
    </div>
  )
}
