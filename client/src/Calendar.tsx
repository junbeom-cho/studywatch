import { useCallback, useEffect, useMemo, useState } from 'react'
import { currentMonth, monthGrid, shiftMonth } from '../../shared/month'
import { formatDuration, studyDateOf } from '../../shared/time'
import type { CalendarData, ScreenshotMeta } from '../../shared/types'
import { levelOf } from './calendarGrid'

interface Props {
  calendar: CalendarData | null
  /** 스크린샷을 찍을 때마다 바뀐다. 목록을 다시 읽는 신호. */
  shotKey: number
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function Calendar({ calendar, shotKey }: Props) {
  const [view, setView] = useState(() => currentMonth(Date.now()))
  const [picked, setPicked] = useState<string | null>(null)
  const [shots, setShots] = useState<ScreenshotMeta[]>([])

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/screenshots')
      if (response.ok) setShots((await response.json()) as ScreenshotMeta[])
    } catch {
      // 스크린샷 목록을 못 읽어도 달력은 그대로 보인다
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, shotKey])

  /** 날짜별 스크린샷. 찍은 시각의 날짜로 묶는다. */
  const byDate = useMemo(() => {
    const grouped = new Map<string, ScreenshotMeta[]>()
    for (const shot of shots) {
      const date = studyDateOf(shot.takenAt)
      const list = grouped.get(date)
      if (list) list.push(shot)
      else grouped.set(date, [shot])
    }
    return grouped
  }, [shots])

  if (!calendar) return null

  const grid = monthGrid(view.year, view.month)
  const totals = calendar.totals
  const pickedShots = picked ? (byDate.get(picked) ?? []) : []
  const monthTotal = grid.weeks
    .flat()
    .reduce((sum, date) => sum + (date ? (totals[date] ?? 0) : 0), 0)

  const move = (offset: number) => {
    setView(shiftMonth(view.year, view.month, offset))
    setPicked(null)
  }

  return (
    <section className="month">
      <header className="month__head">
        <button type="button" className="month__nav" onClick={() => move(-1)} title="이전 달">
          ‹
        </button>
        <div className="month__title">
          <strong>{grid.label}</strong>
          <span className="month__total">{formatDuration(monthTotal)}</span>
        </div>
        <button type="button" className="month__nav" onClick={() => move(1)} title="다음 달">
          ›
        </button>
      </header>

      <div className="month__weekdays">
        {WEEKDAYS.map((label) => (
          <span key={label} className="month__weekday">
            {label}
          </span>
        ))}
      </div>

      <div className="month__grid">
        {grid.weeks.flat().map((date, index) => {
          if (!date) return <span key={`empty-${index}`} className="day day--void" />

          const total = totals[date] ?? 0
          const shotCount = byDate.get(date)?.length ?? 0
          const classes = [
            'day',
            `day--${levelOf(total)}`,
            date === calendar.today ? 'day--today' : '',
            date === picked ? 'day--picked' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <button
              key={date}
              type="button"
              className={classes}
              onClick={() => setPicked(date === picked ? null : date)}
              title={`${date} · ${total > 0 ? formatDuration(total) : '기록 없음'}`}
            >
              <span className="day__number">{Number(date.slice(8))}</span>
              {total > 0 && <span className="day__time">{formatDuration(total)}</span>}
              {shotCount > 0 && <span className="day__dot" />}
            </button>
          )
        })}
      </div>

      {picked && (
        <div className="shots">
          <span className="field__label">
            {picked} · {formatDuration(totals[picked] ?? 0)}
            {pickedShots.length > 0 ? ` · 스크린샷 ${pickedShots.length}장` : ' · 스크린샷 없음'}
          </span>
          {pickedShots.length > 0 && (
            <div className="shots__list">
              {pickedShots.map((shot) => (
                <a
                  key={shot.id}
                  className="shots__item"
                  href={`/api/screenshots/${shot.id}`}
                  target="_blank"
                  rel="noreferrer"
                  title="새 탭에서 크게 보기"
                >
                  <img src={`/api/screenshots/${shot.id}`} alt="" loading="lazy" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
