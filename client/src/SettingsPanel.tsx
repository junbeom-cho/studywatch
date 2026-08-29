import { useEffect, useRef, useState } from 'react'
import type { Settings } from '../../shared/types'

interface Props {
  settings: Settings
  onSave: (patch: Partial<Settings>) => void
}

const DEBOUNCE_MS = 600

const FIELDS: Array<{ key: keyof Settings; label: string; placeholder: string }> = [
  { key: 'nickname', label: '닉네임', placeholder: '화면에 표시할 이름' },
  { key: 'courseName', label: '강의명', placeholder: '듣고 있는 강의' },
  { key: 'instructorName', label: '강사명', placeholder: '강사 이름' },
]

export function SettingsPanel({ settings, onSave }: Props) {
  const [draft, setDraft] = useState(settings)
  const pending = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 다른 기기에서 바꾼 값을 따라간다. 단, 내가 타이핑 중이면 건드리지 않는다.
  useEffect(() => {
    if (!pending.current) setDraft(settings)
  }, [settings])

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const edit = (key: keyof Settings, value: string) => {
    const next = { ...draft, [key]: value }
    setDraft(next)
    pending.current = true
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      pending.current = false
      onSave(next)
    }, DEBOUNCE_MS)
  }

  return (
    <section className="settings">
      {FIELDS.map((field) => (
        <label key={field.key} className="field">
          <span className="field__label">{field.label}</span>
          <input
            className="field__input"
            type="text"
            maxLength={200}
            value={draft[field.key]}
            placeholder={field.placeholder}
            onChange={(event) => edit(field.key, event.target.value)}
          />
        </label>
      ))}
    </section>
  )
}
