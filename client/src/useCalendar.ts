import { useCallback, useEffect, useState } from 'react'
import type { CalendarData } from '../../shared/types'

const REFRESH_MS = 60_000

/**
 * 날짜별 누적 시간. 캔버스(FR-8)와 화면 아래 달력이 같은 값을 쓴다.
 * 못 불러와도 null 을 유지한다 — 달력이 없다고 스톱워치가 멈추지는 않는다.
 */
export function useCalendar(sessionKey: string) {
  const [data, setData] = useState<CalendarData | null>(null)

  const reload = useCallback(async () => {
    try {
      const response = await fetch('/api/calendar')
      if (response.ok) setData((await response.json()) as CalendarData)
    } catch {
      // 다음 갱신에서 다시 시도한다
    }
  }, [])

  // 세션이 시작·종료될 때마다 다시 부른다. 정지 직후 오늘 칸이 바로 채워지도록.
  useEffect(() => {
    void reload()
    const timer = setInterval(() => void reload(), REFRESH_MS)
    return () => clearInterval(timer)
  }, [reload, sessionKey])

  return { calendar: data, reload }
}
