import { useCallback, useEffect, useRef, useState } from 'react'
import { formatDuration } from '../../shared/time'
import type { CalendarData } from '../../shared/types'
import { describe, streakOf, weeksOf } from './calendarGrid'

const REFRESH_MS = 60_000
const WEEKDAY_LABELS = ['', '월', '', '수', '', '금', '']

export function Calendar({ sessionKey }: { sessionKey: string }) {
  const [data, setData] = useState<CalendarData | null>(null)
  const scroll = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/calendar')
      if (response.ok) setData((await response.json()) as CalendarData)
    } catch {
      // 달력이 없다고 스톱워치가 멈추지는 않는다. 다음 갱신에서 다시 시도한다.
    }
  }, [])

  // 세션이 시작·종료될 때마다 다시 부른다. 정지 직후 오늘 칸이 바로 채워지도록.
  useEffect(() => {
    void load()
    const timer = setInterval(() => void load(), REFRESH_MS)
    return () => clearInterval(timer)
  }, [load, sessionKey])

  // 좁은 화면에서는 반년치가 다 안 들어간다. 오늘이 보이는 오른쪽 끝에서 시작한다.
  useEffect(() => {
    const element = scroll.current
    if (element) element.scrollLeft = element.scrollWidth
  }, [data])

  if (!data) return null

  const weeks = weeksOf(data.from, data.to, data.totals)
  const todayMs = data.totals[data.today] ?? 0
  const streak = streakOf(data.today, data.totals)

  return (
    <section className="calendar">
      <header className="calendar__head">
        <span>
          오늘 <strong>{formatDuration(todayMs)}</strong>
        </span>
        <span className="calendar__streak">
          {streak > 0 ? `연속 ${streak}일` : '연속 기록 없음'}
        </span>
      </header>

      <div className="calendar__body">
        {/* 라벨은 스크롤과 함께 밀리면 안 되므로 바깥에 둔다 */}
        <div className="calendar__labels">
          {WEEKDAY_LABELS.map((label, index) => (
            <span key={index} className="calendar__label">
              {label}
            </span>
          ))}
        </div>

        <div className="calendar__scroll" ref={scroll}>
          <div className="calendar__grid">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="calendar__week">
                {week.map((cell, dayIndex) =>
                  cell ? (
                    <span
                      key={cell.date}
                      className={`calendar__cell calendar__cell--${cell.level}${
                        cell.date === data.today ? ' calendar__cell--today' : ''
                      }`}
                      title={describe(cell)}
                    />
                  ) : (
                    <span
                      key={`empty-${dayIndex}`}
                      className="calendar__cell calendar__cell--void"
                    />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
