import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppState } from '../../shared/types'
import { api } from './api'

export type Connection = 'connecting' | 'online' | 'offline'

const RESYNC_MS = 15_000

export function useAppState() {
  const [state, setState] = useState<AppState | null>(null)
  const [connection, setConnection] = useState<Connection>('connecting')
  /** 내 시계와 서버 시계의 차이. 폰과 PC의 시각이 어긋나도 같은 시간이 보이게 한다. */
  const skew = useRef(0)

  const run = useCallback(async (call: () => Promise<AppState>) => {
    try {
      const next = await call()
      skew.current = Date.now() - next.serverNow
      setState(next)
      setConnection('online')
    } catch {
      setConnection('offline')
    }
  }, [])

  useEffect(() => {
    const sync = () => void run(api.state)
    sync()

    const timer = setInterval(sync, RESYNC_MS)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') sync()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', sync)

    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', sync)
    }
  }, [run])

  const serverNow = useCallback(() => Date.now() - skew.current, [])

  return { state, connection, serverNow, run }
}
