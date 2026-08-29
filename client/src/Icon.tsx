interface Props {
  name: 'play' | 'pause' | 'stop' | 'trash' | 'camera' | 'pip'
}

/**
 * 버튼용 작은 아이콘. 라이브러리를 붙이지 않고 필요한 것만 직접 그린다.
 * currentColor 를 쓰므로 버튼 색을 따라간다.
 */
const PATHS: Record<Props['name'], string> = {
  play: 'M8 5.5v13l11-6.5z',
  pause: 'M9 5.5h3v13H9zM14 5.5h3v13h-3z',
  stop: 'M7 7h10v10H7z',
  trash:
    'M4 6.5h16M9.5 6.5V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.5M6.5 6.5 7.4 19a1 1 0 0 0 1 .9h7.2a1 1 0 0 0 1-.9l.9-12.5',
  camera: 'M4.5 8.5h3l1.4-2h6.2l1.4 2h3v10h-15zM12 16.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  pip: 'M3.5 5.5h17v13h-17zM12 12h7v5h-7z',
}

const FILLED: Array<Props['name']> = ['play', 'pause', 'stop']

export function Icon({ name }: Props) {
  const filled = FILLED.includes(name)
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
