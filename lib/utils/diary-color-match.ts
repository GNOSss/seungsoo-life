/**
 * 활동 라이브러리 키워드 매칭.
 *
 * 라이브러리의 `name` 컬럼은 콤마로 구분된 키워드 리스트로 취급된다
 * (예: "잠,화장실,샤워,장실,나준"). 시간 로그의 활동명이 이 중 하나라도
 * 포함하면 그 라이브러리 행의 색을 사용한다.
 *
 * 매칭은 sort_order가 낮은 행부터 (settings 페이지에서 위쪽) 우선.
 */

export type ActivityLibRow = {
  name: string
  color: string
}

export const DEFAULT_COLOR = "#D8D8D8"

/** name 필드를 콤마로 split + trim → 키워드 배열 */
export function parseKeywords(name: string): string[] {
  return name
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * activity_name이 lib의 키워드 중 하나라도 포함하면 그 lib의 color,
 * 아니면 DEFAULT_COLOR.
 * libs는 sort_order 오름차순으로 정렬되어 있어야 함 (첫 매칭 우선).
 */
export function findColorByKeywords(
  activityName: string,
  libs: ActivityLibRow[]
): string {
  for (const lib of libs) {
    for (const kw of parseKeywords(lib.name)) {
      if (activityName.includes(kw)) return lib.color
    }
  }
  return DEFAULT_COLOR
}

/**
 * activity_name과 매칭되는 lib 행 찾기 (find with index for in-place update).
 * 없으면 null.
 */
export function findMatchingLib<T extends ActivityLibRow>(
  activityName: string,
  libs: T[]
): T | null {
  for (const lib of libs) {
    for (const kw of parseKeywords(lib.name)) {
      if (activityName.includes(kw)) return lib
    }
  }
  return null
}
