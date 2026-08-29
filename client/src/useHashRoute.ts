import { useEffect, useState } from 'react'

export type Route = 'watch' | 'log' | 'settings'

export const ROUTES: ReadonlyArray<{ id: Route; label: string }> = [
  { id: 'watch', label: '스톱워치' },
  { id: 'log', label: '달력' },
  { id: 'settings', label: '설정' },
]

const isRoute = (value: string): value is Route => ROUTES.some((route) => route.id === value)

function parse(): Route {
  const raw = window.location.hash.replace(/^#\/?/, '')
  return isRoute(raw) ? raw : 'watch'
}

/**
 * 해시 라우팅. 라우터를 붙일 만큼 화면이 많지 않다.
 * 뒤로가기와 북마크가 되는 것이 탭 상태보다 나아서 해시를 쓴다.
 */
export function useHashRoute(): Route {
  const [route, setRoute] = useState(parse)

  useEffect(() => {
    const sync = () => setRoute(parse())
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  return route
}
