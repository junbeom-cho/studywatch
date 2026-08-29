import { useEffect, useRef, useState } from 'react'

interface Props {
  disabled: boolean
  onConfirm: () => void
}

/** 되돌릴 수 없으므로 한 번 더 묻는다. 3초 안에 다시 누르지 않으면 원래대로 돌아간다. */
const CONFIRM_WINDOW_MS = 3000

export function DiscardButton({ disabled, onConfirm }: Props) {
  const [armed, setArmed] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const click = () => {
    if (timer.current) clearTimeout(timer.current)
    if (armed) {
      setArmed(false)
      onConfirm()
      return
    }
    setArmed(true)
    timer.current = setTimeout(() => setArmed(false), CONFIRM_WINDOW_MS)
  }

  return (
    <button
      className={`btn btn--ghost${armed ? ' btn--danger' : ''}`}
      disabled={disabled}
      onClick={click}
    >
      {armed ? '정말 버릴까?' : '버리기'}
    </button>
  )
}
