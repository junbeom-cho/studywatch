import { useEffect, useRef, useState } from 'react'
import type { Settings } from '../../shared/types'
import { canNotify, requestPermission } from './notify'

interface Props {
  settings: Settings
  onSave: (patch: Partial<Settings>) => void
}

const DEBOUNCE_MS = 600

const TEXT_FIELDS = [
  { key: 'nickname', label: '닉네임', placeholder: '화면에 표시할 이름' },
  { key: 'courseName', label: '강의명', placeholder: '듣고 있는 강의' },
  { key: 'instructorName', label: '강사명', placeholder: '강사 이름' },
] as const

const toMinutes = (ms: number | null): string =>
  ms === null ? '' : String(Math.round(ms / 60_000))

const toMs = (text: string): number | null => {
  const minutes = Number(text.trim())
  if (text.trim() === '' || !Number.isFinite(minutes) || minutes <= 0) return null
  return Math.round(minutes) * 60_000
}

interface Draft {
  nickname: string
  courseName: string
  instructorName: string
  goalMinutes: string
  intervalMinutes: string
  soundEnabled: boolean
}

const draftOf = (settings: Settings): Draft => ({
  nickname: settings.nickname,
  courseName: settings.courseName,
  instructorName: settings.instructorName,
  goalMinutes: toMinutes(settings.goalMs),
  intervalMinutes: toMinutes(settings.intervalMs),
  soundEnabled: settings.soundEnabled,
})

const patchOf = (draft: Draft): Partial<Settings> => ({
  nickname: draft.nickname,
  courseName: draft.courseName,
  instructorName: draft.instructorName,
  goalMs: toMs(draft.goalMinutes),
  intervalMs: toMs(draft.intervalMinutes),
  soundEnabled: draft.soundEnabled,
})

export function SettingsPanel({ settings, onSave }: Props) {
  const [draft, setDraft] = useState(() => draftOf(settings))
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    canNotify() ? Notification.permission : 'unsupported',
  )
  const pending = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 다른 기기에서 바꾼 값을 따라간다. 단, 내가 타이핑 중이면 건드리지 않는다.
  useEffect(() => {
    if (!pending.current) setDraft(draftOf(settings))
  }, [settings])

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const edit = (next: Draft) => {
    setDraft(next)
    pending.current = true
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      pending.current = false
      onSave(patchOf(next))
    }, DEBOUNCE_MS)
  }

  // 권한 요청은 사용자가 알림을 켜는 그 조작 안에서 해야 한다
  const editAlarm = (next: Draft) => {
    const turningOn = next.goalMinutes !== '' || next.intervalMinutes !== ''
    if (turningOn && permission === 'default') void requestPermission().then(setPermission)
    edit(next)
  }

  return (
    <>
      <section className="settings">
        {TEXT_FIELDS.map((field) => (
          <label key={field.key} className="field">
            <span className="field__label">{field.label}</span>
            <input
              className="field__input"
              type="text"
              maxLength={200}
              value={draft[field.key]}
              placeholder={field.placeholder}
              onChange={(event) => edit({ ...draft, [field.key]: event.target.value })}
            />
          </label>
        ))}
      </section>

      <section className="settings">
        <label className="field">
          <span className="field__label">목표 시간 (분)</span>
          <input
            className="field__input"
            type="number"
            min={1}
            inputMode="numeric"
            value={draft.goalMinutes}
            placeholder="비우면 알림 없음"
            onChange={(event) => editAlarm({ ...draft, goalMinutes: event.target.value })}
          />
        </label>

        <label className="field">
          <span className="field__label">반복 알림 (분마다)</span>
          <input
            className="field__input"
            type="number"
            min={1}
            inputMode="numeric"
            value={draft.intervalMinutes}
            placeholder="비우면 알림 없음"
            onChange={(event) => editAlarm({ ...draft, intervalMinutes: event.target.value })}
          />
        </label>

        <label className="field field--inline">
          <input
            className="field__check"
            type="checkbox"
            checked={draft.soundEnabled}
            onChange={(event) => edit({ ...draft, soundEnabled: event.target.checked })}
          />
          <span className="field__label">소리도 같이</span>
        </label>
      </section>

      {permission === 'denied' && (
        <p className="notice notice--small">
          브라우저 알림이 차단돼 있다. 소리만 울린다. 주소창 왼쪽에서 알림을 허용하면 된다.
        </p>
      )}
      {permission === 'unsupported' && (
        <p className="notice notice--small">
          이 접속에서는 브라우저 알림을 쓸 수 없다. 소리만 울린다.
        </p>
      )}
    </>
  )
}
