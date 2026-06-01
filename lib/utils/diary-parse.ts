/**
 * 시간 로그 자연어 파싱.
 *
 * 입력 1줄: "[활동명][HHMM]" 예: "개발0018", "장실에 갖힘0908"
 * - 마지막 4자리 숫자 = HHMM (24시간제)
 * - 그 앞 전부(공백·구두점·한자 허용) = 활동명
 *
 * 첫 항목의 시작 시각 = 전날 마지막 활동의 종료 시각 + 1분
 * 그 외 항목 = 직전 항목의 종료 시각 + 1분
 * 자정 넘김 자동 분할 (오늘 23:50-23:59:59 + 다음날 00:00-end)
 */

export type ParsedLine =
  | {
      ok: true
      activity: string
      endHHMM: string
      rawLine: string
    }
  | { ok: false; rawLine: string; error: string }

export type DiaryEntryDraft = {
  date: string
  start_time: string
  end_time: string
  activity_name: string
  raw_input: string
}

export function parseLine(line: string): ParsedLine {
  const trimmed = line.trim()
  if (!trimmed) return { ok: false, rawLine: line, error: "빈 줄" }
  const m = trimmed.match(/^(.*?)(\d{4})\s*$/)
  if (!m) return { ok: false, rawLine: line, error: "끝에 HHMM 4자리 숫자 없음" }
  const activity = m[1].trim()
  const hhmm = m[2]
  const hh = Number(hhmm.slice(0, 2))
  const mm = Number(hhmm.slice(2, 4))
  if (hh > 23 || mm > 59)
    return { ok: false, rawLine: line, error: "시각 범위 오류 (HH 0-23, MM 0-59)" }
  if (!activity)
    return { ok: false, rawLine: line, error: "활동명이 비어있음" }
  const endHHMM = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`
  return { ok: true, activity, endHHMM, rawLine: line }
}

export function addOneMinute(hhmm: string): {
  next: string
  crossedMidnight: boolean
} {
  const [hh, mm] = hhmm.split(":").map(Number)
  let nm = mm + 1
  let nh = hh
  if (nm >= 60) {
    nm = 0
    nh += 1
  }
  if (nh >= 24) {
    return { next: "00:00", crossedMidnight: true }
  }
  return {
    next: `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`,
    crossedMidnight: false,
  }
}

function toFullTime(hhmm: string): string {
  return `${hhmm}:00`
}

function timeLT(a: string, b: string): boolean {
  return a < b
}

export function parseAllLines(
  input: string,
  date: string,
  prevDayLastEnd: string | null
): {
  drafts: DiaryEntryDraft[]
  failed: { line: string; error: string }[]
} {
  const drafts: DiaryEntryDraft[] = []
  const failed: { line: string; error: string }[] = []

  const lines = input.split("\n")
  let cursorHHMM: string | null = null
  if (prevDayLastEnd) {
    const hhmm = prevDayLastEnd.slice(0, 5)
    const { next, crossedMidnight } = addOneMinute(hhmm)
    cursorHHMM = crossedMidnight ? "00:00" : next
  }

  for (const line of lines) {
    if (!line.trim()) continue
    const parsed = parseLine(line)
    if (!parsed.ok) {
      failed.push({ line: parsed.rawLine, error: parsed.error })
      continue
    }
    const endHHMM = parsed.endHHMM

    let startHHMM: string
    if (cursorHHMM === null) {
      startHHMM = endHHMM
    } else {
      startHHMM = cursorHHMM
    }

    if (timeLT(endHHMM, startHHMM)) {
      const prevDate = (() => {
        const d = new Date(`${date}T00:00:00Z`)
        d.setUTCDate(d.getUTCDate() - 1)
        return d.toISOString().slice(0, 10)
      })()
      drafts.push({
        date: prevDate,
        start_time: toFullTime(startHHMM),
        end_time: "23:59:59",
        activity_name: parsed.activity,
        raw_input: parsed.rawLine,
      })
      drafts.push({
        date,
        start_time: "00:00:00",
        end_time: toFullTime(endHHMM),
        activity_name: parsed.activity,
        raw_input: parsed.rawLine,
      })
    } else {
      drafts.push({
        date,
        start_time: toFullTime(startHHMM),
        end_time: toFullTime(endHHMM),
        activity_name: parsed.activity,
        raw_input: parsed.rawLine,
      })
    }

    const { next, crossedMidnight } = addOneMinute(endHHMM)
    cursorHHMM = crossedMidnight ? "00:00" : next
  }

  return { drafts, failed }
}
