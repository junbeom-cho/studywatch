import { ROUTES, type Route } from './useHashRoute'

interface Props {
  current: Route
  /** 공부하는 동안 시계가 돌고 있으면 다른 탭에서도 알 수 있게 한다 */
  running: boolean
}

export function Tabs({ current, running }: Props) {
  return (
    <nav className="tabs">
      {ROUTES.map((route) => (
        <a
          key={route.id}
          className={`tab${route.id === current ? ' tab--on' : ''}`}
          href={`#/${route.id}`}
        >
          {route.label}
          {route.id === 'watch' && running && <span className="tab__dot" title="측정 중" />}
        </a>
      ))}
    </nav>
  )
}
