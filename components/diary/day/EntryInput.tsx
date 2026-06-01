"use client"

import { useState, useTransition, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { upsertRawInput } from "@/lib/actions/diary-days"
import { parseAllLines } from "@/lib/utils/diary-parse"
import { toast } from "sonner"

export function EntryInput({
  date,
  initialRawInput,
  prevDayLastEnd,
}: {
  date: string
  initialRawInput: string
  prevDayLastEnd: string | null
}) {
  const [text, setText] = useState(initialRawInput)
  const [pending, startTransition] = useTransition()

  const { drafts, failed } = parseAllLines(text, date, prevDayLastEnd)
  const todayDrafts = drafts.filter((d) => d.date === date)
  const prevDayDrafts = drafts.filter((d) => d.date !== date)

  const onSave = () => {
    startTransition(async () => {
      const result = await upsertRawInput({ date, raw_input: text })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      if (result.failed.length > 0) {
        toast.warning(`${result.failed.length}개 라인 파싱 실패`)
      } else {
        toast.success("저장됨")
      }
    })
  }

  useEffect(() => {
    setText(initialRawInput)
  }, [initialRawInput])

  return (
    <div className="space-y-2">
      <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">
            시간 로그 (한 줄 = 한 활동, 끝에 HHMM)
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={pending}
            rows={12}
            placeholder={"개발0018\n드라마0300\n잠0820"}
            className="block w-full rounded border border-neutral-300 px-3 py-2 font-mono text-sm leading-relaxed"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">
            미리보기
          </label>
          <div className="space-y-1 rounded border border-neutral-200 bg-neutral-50 p-3 font-mono text-xs">
            {prevDayDrafts.length > 0 ? (
              <div className="mb-2 space-y-0.5 border-b border-neutral-200 pb-2">
                <p className="text-[10px] text-neutral-400">
                  ↑ 어제로 분할 (자정 넘김)
                </p>
                {prevDayDrafts.map((d, i) => (
                  <div key={`p-${i}`} className="text-neutral-600">
                    {d.start_time.slice(0, 5)}-{d.end_time.slice(0, 5)}{" "}
                    {d.activity_name}
                  </div>
                ))}
              </div>
            ) : null}
            {todayDrafts.length === 0 && prevDayDrafts.length === 0 ? (
              <p className="text-neutral-400">입력 후 표시됨</p>
            ) : (
              todayDrafts.map((d, i) => (
                <div key={`t-${i}`} className="text-neutral-700">
                  {d.start_time.slice(0, 5)}-{d.end_time.slice(0, 5)}{" "}
                  {d.activity_name}
                </div>
              ))
            )}
            {failed.length > 0 ? (
              <div className="mt-2 space-y-0.5 border-t border-neutral-200 pt-2">
                <p className="text-[10px] text-red-500">
                  파싱 실패 ({failed.length})
                </p>
                {failed.map((f, i) => (
                  <div key={`f-${i}`} className="text-red-600">
                    ⚠ {f.line} — {f.error}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={pending}>
          {pending ? "저장 중..." : "저장"}
        </Button>
      </div>
    </div>
  )
}
