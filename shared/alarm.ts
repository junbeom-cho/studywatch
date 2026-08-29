import { formatDuration } from './time'

export type AlarmKind = 'goal' | 'interval'

export interface Alarm {
  kind: AlarmKind
  /** 이 경과 시간(ms)에 울린다 */
  at: number
}

/**
 * 지금 경과 시간 기준으로 다음에 울려야 할 알림. 울릴 것이 없으면 null.
 *
 * 무엇이 울렸는지 기억하지 않고 매번 "지금 다음"을 계산한다. 그래서 새로고침하거나
 * 다른 기기에서 열어도 이미 지난 알림이 다시 울리지 않는다.
 */
export function messageFor(kind: AlarmKind, atMs: number): string {
  return kind === 'goal' ? `목표 ${formatDuration(atMs)} 달성` : `${formatDuration(atMs)} 경과`
}

export function nextAlarm(
  elapsed: number,
  goalMs: number | null,
  intervalMs: number | null,
): Alarm | null {
  const candidates: Alarm[] = []

  // 목표는 한 번뿐이다. 이미 지났으면 다시 울리지 않는다.
  if (goalMs !== null && goalMs > 0 && elapsed < goalMs) {
    candidates.push({ kind: 'goal', at: goalMs })
  }

  // 반복은 지나온 배수 다음 배수에서 울린다.
  if (intervalMs !== null && intervalMs > 0) {
    candidates.push({ kind: 'interval', at: (Math.floor(elapsed / intervalMs) + 1) * intervalMs })
  }

  if (candidates.length === 0) return null
  return candidates.reduce((soonest, candidate) =>
    candidate.at < soonest.at ? candidate : soonest,
  )
}
