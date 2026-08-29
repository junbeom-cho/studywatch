import type { Theme } from '../../shared/types'
import { Icon } from './Icon'
import { ROUTES, type Route } from './useHashRoute'

interface Props {
  current: Route
  /** 공부하는 동안 시계가 돌고 있으면 다른 탭에서도 알 수 있게 한다 */
  running: boolean
  theme: Theme
  onToggleTheme: () => void
}

export function Tabs({ current, running, theme, onToggleTheme }: Props) {
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

      <button
        type="button"
        className="tab tab--icon"
        onClick={onToggleTheme}
        title={theme === 'dark' ? '밝게' : '어둡게'}
      >
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
      </button>
    </nav>
  )
}
