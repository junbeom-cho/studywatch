import { formatDuration, shiftStudyDate, studyDateRange, weekdayOf } from '../../shared/time'

/**
 * 잔디 격자를 만든다. 한 열이 한 주(일~토)이고, 첫 열 앞쪽은 빈 칸으로 채운다.
 */

/** 색 단계 경계 (분). PRD 6 Q-1 에서 정했다. */
const THRESHOLDS_MIN = [30, 60, 120]

export type Level = 0 | 1 | 2 | 3 | 4

export interface Cell {
  date: string
  totalMs: number
  level: Level
}

export function levelOf(totalMs: number): Level {
  if (totalMs <= 0) return 0
  const minutes = totalMs / 60_000
  const passed = THRESHOLDS_MIN.filter((threshold) => minutes >= threshold).length
  return (passed + 1) as Level
}

/** 격자를 주 단위 열로 자른다. null 은 범위 밖이라 비워 두는 칸이다. */
export function weeksOf(
  from: string,
  to: string,
  totals: Record<string, number>,
): Array<Array<Cell | null>> {
  const dates = studyDateRange(from, to)
  const cells: Array<Cell | null> = Array.from({ length: weekdayOf(from) }, () => null)

  for (const date of dates) {
    const totalMs = totals[date] ?? 0
    cells.push({ date, totalMs, level: levelOf(totalMs) })
  }
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks: Array<Array<Cell | null>> = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

/**
 * 오늘부터 거슬러 올라가며 이어진 공부 일수.
 * 오늘 아직 시작 전이면 어제까지의 연속을 보여준다 — 하루가 끝나기도 전에 0 이 되면 맥이 빠진다.
 */
export function streakOf(today: string, totals: Record<string, number>): number {
  let cursor = (totals[today] ?? 0) > 0 ? today : shiftStudyDate(today, -1)
  let count = 0

  while ((totals[cursor] ?? 0) > 0) {
    count += 1
    cursor = shiftStudyDate(cursor, -1)
    if (count > 1000) break
  }
  return count
}

export function describe(cell: Cell): string {
  return cell.totalMs > 0 ? `${cell.date} · ${formatDuration(cell.totalMs)}` : `${cell.date} · 없음`
}
