import type { PauseSpan } from './types'

/**
 * 학습일은 세션을 **시작한** 시각의 날짜다. 자정을 넘겨도 세션을 쪼개지 않는다.
 * 23:50 에 시작해 01:00 에 끝냈으면 전부 시작한 날에 붙고,
 * 00:30 에 시작했으면 시작한 날이 이미 새 날이므로 그날에 붙는다.
 */

const HOUR_MS = 3_600_000
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const

const pad2 = (n: number) => String(n).padStart(2, '0')

/**
 * 세션에서 실제로 시간이 흐른 구간만 골라낸다. 일시정지 구간은 빠진다.
 * until 은 "지금" 또는 세션 종료 시각.
 */
export function activeSpans(
  startedAt: number,
  pauses: PauseSpan[],
  until: number,
): Array<[number, number]> {
  const spans: Array<[number, number]> = []
  const ordered = [...pauses].sort((a, b) => a.pausedAt - b.pausedAt)
  let cursor = startedAt

  for (const pause of ordered) {
    const pausedAt = Math.min(pause.pausedAt, until)
    if (pausedAt > cursor) spans.push([cursor, pausedAt])
    // 아직 멈춰 있으면 여기서 끝. 뒤에 남은 구간은 흐르지 않은 시간이다.
    if (pause.resumedAt === null) return spans
    cursor = Math.max(cursor, Math.min(pause.resumedAt, until))
    if (cursor >= until) return spans
  }

  if (until > cursor) spans.push([cursor, until])
  return spans
}

export function elapsedMs(startedAt: number, pauses: PauseSpan[], until: number): number {
  return activeSpans(startedAt, pauses, until).reduce((sum, [from, to]) => sum + (to - from), 0)
}

/** HH:MM:SS.mmm */
export function formatElapsed(ms: number): { clock: string; millis: string } {
  const total = Math.max(0, Math.floor(ms))
  const hours = Math.floor(total / HOUR_MS)
  const minutes = Math.floor(total / 60_000) % 60
  const seconds = Math.floor(total / 1000) % 60
  return {
    clock: `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`,
    millis: String(total % 1000).padStart(3, '0'),
  }
}

/** 2026년 8월 30일 (일) */
export function formatDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`
}

/**
 * 세션이 기록될 학습일(YYYY-MM-DD).
 * 반드시 세션의 **시작 시각**을 넘긴다. 종료 시각을 넘기면 날짜가 어긋난다.
 */
export function studyDateOf(startedAt: number): string {
  const d = new Date(startedAt)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** date 에서 days 만큼 떨어진 학습일. 음수면 과거. */
export function shiftStudyDate(date: string, days: number): string {
  const parts = date.split('-')
  const shifted = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]) + days)
  return studyDateOf(shifted.getTime())
}

/** from 부터 to 까지(양끝 포함)의 학습일을 순서대로. 달력 격자를 채울 때 쓴다. */
export function studyDateRange(from: string, to: string): string[] {
  const dates: string[] = []
  let cursor = from
  while (cursor <= to) {
    dates.push(cursor)
    cursor = shiftStudyDate(cursor, 1)
    if (dates.length > 1000) break // 방어: 인자가 뒤집혀 들어와도 무한 루프에 빠지지 않게
  }
  return dates
}

/** 요일 번호 (0=일). 달력 격자에서 세로 위치를 정한다. */
export function weekdayOf(date: string): number {
  const parts = date.split('-')
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getDay()
}

/** 사람이 읽는 길이. 30분 → "30분", 90분 → "1시간 30분", 120분 → "2시간" */
export function formatDuration(ms: number): string {
  const minutes = Math.round(Math.max(0, ms) / 60_000)
  if (minutes < 60) return `${minutes}분`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`
}
