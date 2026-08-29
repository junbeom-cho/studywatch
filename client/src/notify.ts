/**
 * 목표 시간 달성과 반복 간격 알림을 실제로 울린다. (PRD 4.5)
 * 언제 울릴지는 shared/alarm.ts 가 정한다.
 * 알림 권한이 없으면 소리만 낸다 — 알림이 안 떴다고 스톱워치가 멈추지는 않는다.
 */

import { messageFor, type AlarmKind } from '../../shared/alarm'

export function canNotify(): boolean {
  return typeof Notification !== 'undefined'
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!canNotify()) return 'denied'
  if (Notification.permission !== 'default') return Notification.permission
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

/** 파일을 두지 않으려고 짧은 두 음을 직접 합성한다. */
function beep(): void {
  const Ctor =
    window.AudioContext ??
    (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return

  try {
    const ctx = new Ctor()
    const now = ctx.currentTime
    for (const [index, frequency] of [880, 1174].entries()) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const start = now + index * 0.18

      osc.frequency.value = frequency
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16)

      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.18)
    }
    setTimeout(() => void ctx.close(), 1000)
  } catch {
    // 소리가 안 나는 것으로 알림 자체를 실패시키지 않는다
  }
}

export function fireAlarm(kind: AlarmKind, atMs: number, sound: boolean): void {
  const body = messageFor(kind, atMs)

  if (canNotify() && Notification.permission === 'granted') {
    try {
      new Notification('StudyWatch', {
        body,
        tag: `studywatch-${kind}`,
        renotify: true,
      } as NotificationOptions)
    } catch {
      // 일부 환경은 Service Worker 없이는 Notification 생성을 막는다. 소리로 대신한다.
    }
  }

  if (sound) beep()
}
