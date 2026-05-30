import { Sidebar } from "@/components/budget/sidebar/Sidebar"

export default function BudgetLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex">
      <Sidebar />
      <main className="min-h-screen flex-1 md:ml-0">{children}</main>
    </div>
  )
}
