import { EmptyWorkoutButton } from "@/components/workout/start/EmptyWorkoutButton"
import { TemplateFolderList } from "@/components/workout/start/TemplateFolderList"

export default function StartPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      <h1 className="text-xl font-bold md:text-2xl">💪 워크아웃 시작</h1>
      <EmptyWorkoutButton />
      <div>
        <h2 className="mb-3 text-base font-semibold">📋 템플릿</h2>
        <TemplateFolderList />
      </div>
    </div>
  )
}
