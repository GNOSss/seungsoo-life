/**
 * 거래 정렬.
 *
 * 공통: 고정 그룹이 먼저 (is_fixed=true → 위), 그 다음 비고정 그룹.
 *
 * mode="alpha" (기본, PRD §6):
 *   [고정 그룹] 1차 가나다 → 2차 가나다 → 날짜
 *   [비고정 그룹] 날짜 오름차순
 *
 * mode="amount" (사용자 선택):
 *   [고정 그룹] 1차 카테고리별 합계 내림차순 → 2차 가나다 → 날짜
 *   [비고정 그룹] 1차 카테고리별 합계 내림차순 → 2차 가나다 → 날짜
 *   * 같은 1차 카테고리는 한곳에 모이도록 그룹화 후 합계 비교.
 *
 * 한 그룹(출금 or 입금) 내에서 적용. 호출자가 type별로 분리해서 호출.
 */

export type SortableTransaction = {
  id: string
  date: string // 'YYYY-MM-DD'
  category_1st: string
  category_2nd: string | null
  amount: number
  is_fixed: boolean
  created_at: string
}

export type SortMode = "alpha" | "amount"

export function sortTransactionsInGroup<T extends SortableTransaction>(
  transactions: T[],
  mode: SortMode = "alpha"
): T[] {
  const koCollator = new Intl.Collator("ko-KR")

  if (mode === "alpha") {
    return [...transactions].sort((a, b) => {
      // 1. 고정이 먼저
      if (a.is_fixed !== b.is_fixed) return a.is_fixed ? -1 : 1

      // 2-a. 고정 그룹: 1차 → 2차 → 날짜
      if (a.is_fixed) {
        const c1 = koCollator.compare(a.category_1st, b.category_1st)
        if (c1 !== 0) return c1
        const c2 = koCollator.compare(a.category_2nd ?? "", b.category_2nd ?? "")
        if (c2 !== 0) return c2
        return a.date.localeCompare(b.date)
      }

      // 2-b. 비고정 그룹: 입력 순서(created_at)
      return a.created_at.localeCompare(b.created_at)
    })
  }

  // mode === "amount"
  // 1차 카테고리별 합계 계산 (고정/비고정 그룹별로 따로)
  const sumByCat = (rows: T[]) => {
    const m = new Map<string, number>()
    for (const r of rows) {
      m.set(r.category_1st, (m.get(r.category_1st) ?? 0) + r.amount)
    }
    return m
  }
  const fixedRows = transactions.filter((t) => t.is_fixed)
  const nonFixedRows = transactions.filter((t) => !t.is_fixed)
  const fixedSums = sumByCat(fixedRows)
  const nonFixedSums = sumByCat(nonFixedRows)

  const compareWithinGroup = (sums: Map<string, number>) => {
    return (a: T, b: T) => {
      const s1 = sums.get(b.category_1st)! - sums.get(a.category_1st)!
      if (s1 !== 0) return s1
      // 같은 1차 카테고리는 가나다 + 2차 가나다 + 날짜
      const c1 = koCollator.compare(a.category_1st, b.category_1st)
      if (c1 !== 0) return c1
      const c2 = koCollator.compare(a.category_2nd ?? "", b.category_2nd ?? "")
      if (c2 !== 0) return c2
      return a.created_at.localeCompare(b.created_at)
    }
  }

  return [
    ...[...fixedRows].sort(compareWithinGroup(fixedSums)),
    ...[...nonFixedRows].sort(compareWithinGroup(nonFixedSums)),
  ]
}
