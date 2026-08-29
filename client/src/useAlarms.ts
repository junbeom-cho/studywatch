import { useEffect, useRef } from 'react'
import { nextAlarm } from '../../shared/alarm'
import { elapsedMs } from '../../shared/time'
import type { AppState } from '../../shared/types'
import { fireAlarm } from './notify'

/**
 * 다음에 울릴 시각을 계산해 그때 한 번만 예약한다. 매 프레임 검사하지 않는 이유는
 * 백그라운드 탭에서 rAF 가 멈추기 때문이다. 예약해 둔 타이머는 그래도 깨어난다.
 *
 * 무엇이 울렸는지 따로 기억하지 않는다. 항상 "지금 경과 시간 다음"을 계산하므로
 * 새로고침해도 이미 지난 알림이 다시 울리지 않는다.
 */
export function useAlarms(state: AppState | null, serverNow: () => number): void {
  const latest = useRef({ state, serverNow })
  latest.current = { state, serverNow }

  const session = state?.session
  const running = session?.state === 'running'
  const goalMs = state?.settings.goalMs ?? null
  const intervalMs = state?.settings.intervalMs ?? null
  const soundEnabled = state?.settings.soundEnabled ?? false

  useEffect(() => {
    if (!running) return
    if (goalMs === null && intervalMs === null) return

    let timer: ReturnType<typeof setTimeout> | null = null
    let cancelled = false

    const arm = () => {
      const current = latest.current.state?.session
      if (cancelled || !current || current.state !== 'running') return

      const elapsed = elapsedMs(current.startedAt, current.pauses, latest.current.serverNow())
      const alarm = nextAlarm(elapsed, goalMs, intervalMs)
      if (!alarm) return

      timer = setTimeout(
        () => {
          if (cancelled) return
          fireAlarm(alarm.kind, alarm.at, soundEnabled)
          arm()
        },
        Math.max(0, alarm.at - elapsed),
      )
    }

    arm()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [running, session?.id, goalMs, intervalMs, soundEnabled])
}
