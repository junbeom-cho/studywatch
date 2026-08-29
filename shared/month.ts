import { studyDateOf } from './time'

/** 한 달 달력 격자. 그 달이 아닌 칸은 null 이다. */
export interface MonthGrid {
  year: number
  /** 1~12 */
  month: number
  label: string
  weeks: Array<Array<string | null>>
}

const pad2 = (n: number) => String(n).padStart(2, '0')

export function monthOf(date: string): { year: number; month: number } {
  const parts = date.split('-')
  return { year: Number(parts[0]), month: Number(parts[1]) }
}

/** 같은 달 안의 날짜 문자열 */
export function dayOf(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

/** offset 달만큼 옮긴 달. -1 이면 전달. */
export function shiftMonth(
  year: number,
  month: number,
  offset: number,
): { year: number; month: number } {
  const moved = new Date(year, month - 1 + offset, 1)
  return { year: moved.getFullYear(), month: moved.getMonth() + 1 }
}

/** 오늘이 속한 달 */
export function currentMonth(now: number): { year: number; month: number } {
  return monthOf(studyDateOf(now))
}

/**
 * 일요일 시작, 6주 고정 격자. 주 수가 달마다 바뀌면 화면 높이가 들썩인다.
 */
export function monthGrid(year: number, month: number): MonthGrid {
  const firstWeekday = new Date(year, month - 1, 1).getDay()
  const dayCount = new Date(year, month, 0).getDate()

  const cells: Array<string | null> = Array.from({ length: firstWeekday }, () => null)
  for (let day = 1; day <= dayCount; day += 1) cells.push(dayOf(year, month, day))
  while (cells.length < 42) cells.push(null)

  const weeks: Array<Array<string | null>> = []
  for (let i = 0; i < 42; i += 7) weeks.push(cells.slice(i, i + 7))

  return { year, month, label: `${year}년 ${month}월`, weeks }
}
