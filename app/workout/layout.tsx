import { WorkoutSidebar } from "@/components/workout/sidebar/WorkoutSidebar"

export default function WorkoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <WorkoutSidebar />
      <main className="min-h-screen flex-1 md:ml-0">{children}</main>
    </div>
  )
}
