import type { PauseSpan } from './types'

/** 하루의 경계. 새벽 4시 이전의 공부는 전날 기록으로 친다. (PRD 4.7) */
export const DAY_START_HOUR = 4

const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000
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

/** 그 시각이 속한 학습일(YYYY-MM-DD). 04:00 경계 적용. */
export function studyDateOf(ts: number): string {
  const d = new Date(ts - DAY_START_HOUR * HOUR_MS)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** 학습일 하루의 실제 구간 [04:00, 다음날 04:00) */
export function studyDayRange(date: string): [number, number] {
  const parts = date.split('-')
  const year = Number(parts[0])
  const month = Number(parts[1])
  const day = Number(parts[2])
  const from = new Date(year, month - 1, day, DAY_START_HOUR).getTime()
  const to = new Date(year, month - 1, day + 1, DAY_START_HOUR).getTime()
  return [from, to]
}

/** from~to 가 걸쳐 있는 학습일 목록. 집계를 다시 계산할 날짜를 고를 때 쓴다. */
export function studyDatesBetween(from: number, to: number): string[] {
  const dates: string[] = []
  const last = studyDateOf(Math.max(from, to))
  let cursor = from
  for (;;) {
    const date = studyDateOf(cursor)
    dates.push(date)
    if (date === last) return dates
    cursor += DAY_MS
    // 방어: 시각이 뒤집혀 들어와도 무한 루프에 빠지지 않게
    if (dates.length > 400) return dates
  }
}
