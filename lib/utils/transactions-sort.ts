/**
 * 거래 정렬 (PRD §6 명세대로).
 *
 * [고정 그룹] 좌측 4px 컬러 보더 ↑ 위
 *   → 1차 카테고리 가나다순
 *   → 2차 카테고리 가나다순
 *   → 날짜 오름차순
 *
 * [비고정 그룹] 좌측 보더 없음 ↓ 아래
 *   → 날짜 오름차순
 *
 * 한 그룹(출금 or 입금) 내에서 적용. 입금/출금 사이 정렬은 호출자가 처리.
 */

export type SortableTransaction = {
  id: string
  date: string // 'YYYY-MM-DD'
  category_1st: string
  category_2nd: string | null
  is_fixed: boolean
}

export function sortTransactionsInGroup<T extends SortableTransaction>(
  transactions: T[]
): T[] {
  const koCollator = new Intl.Collator("ko-KR")

  return [...transactions].sort((a, b) => {
    // 1. 고정이 먼저 (is_fixed=true → 위)
    if (a.is_fixed !== b.is_fixed) return a.is_fixed ? -1 : 1

    // 2-a. 고정 그룹: 1차 → 2차 → 날짜
    if (a.is_fixed) {
      const c1 = koCollator.compare(a.category_1st, b.category_1st)
      if (c1 !== 0) return c1
      const c2 = koCollator.compare(a.category_2nd ?? "", b.category_2nd ?? "")
      if (c2 !== 0) return c2
      return a.date.localeCompare(b.date)
    }

    // 2-b. 비고정 그룹: 날짜만
    return a.date.localeCompare(b.date)
  })
}
