import { useCallback, useEffect, useRef, useState } from 'react'
import { formatClock, formatDuration } from '../../shared/time'
import type { SessionRecord } from '../../shared/types'
import { Icon } from './Icon'

interface Props {
  date: string
  /** 기록을 지우면 달력 숫자도 바뀐다 */
  onChanged: () => void
}

/** 되돌릴 수 없으므로 한 번 더 묻는다. 3초 안에 다시 누르지 않으면 원래대로. */
const CONFIRM_WINDOW_MS = 3000

export function SessionList({ date, onChanged }: Props) {
  const [records, setRecords] = useState<SessionRecord[] | null>(null)
  const [armed, setArmed] = useState<number | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/sessions?date=${date}`)
      if (response.ok) setRecords((await response.json()) as SessionRecord[])
    } catch {
      setProblem('기록을 읽지 못했다')
    }
  }, [date])

  useEffect(() => {
    setRecords(null)
    setArmed(null)
    void load()
  }, [load])

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const remove = async (id: number) => {
    if (timer.current) clearTimeout(timer.current)

    if (armed !== id) {
      setArmed(id)
      timer.current = setTimeout(() => setArmed(null), CONFIRM_WINDOW_MS)
      return
    }

    setArmed(null)
    setProblem(null)
    try {
      const response = await fetch(`/api/sessions/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string }
        setProblem(payload.error ?? `지우지 못했다 (${response.status})`)
        return
      }
      await load()
      onChanged()
    } catch {
      setProblem('지우지 못했다')
    }
  }

  if (records === null) return null

  return (
    <div className="records">
      <span className="field__label">기록 {records.length}건</span>

      {records.length === 0 && <p className="records__empty">이 날 기록이 없다.</p>}

      {records.map((record) => (
        <div key={record.id} className={`record${record.live ? ' record--live' : ''}`}>
          <span className="record__span">
            {formatClock(record.startedAt)}
            {' ~ '}
            {record.stoppedAt === null ? '진행 중' : formatClock(record.stoppedAt)}
          </span>
          <strong className="record__time">{formatDuration(record.elapsedMs)}</strong>

          {record.live ? (
            <span className="record__note">측정 중</span>
          ) : (
            <button
              type="button"
              className={`record__remove${armed === record.id ? ' record__remove--armed' : ''}`}
              onClick={() => void remove(record.id)}
              title="이 기록 지우기"
            >
              {armed === record.id ? '정말?' : <Icon name="trash" />}
            </button>
          )}
        </div>
      ))}

      {problem && <p className="notice notice--small">{problem}</p>}
    </div>
  )
}
