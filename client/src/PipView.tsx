import { useRef } from 'react'
import type { AppState } from '../../shared/types'
import { WatchCanvas } from './WatchCanvas'
import type { FaceCalendar } from './face'

interface Props {
  state: AppState
  serverNow: () => number
  background: HTMLImageElement | null
  calendar: FaceCalendar | null
  offline: boolean
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
}

/**
 * PIP 창 안의 화면. 본 창과 같은 WatchCanvas 를 쓰되 캔버스는 이 창에 새로 만들어진다.
 * 보기만 하는 것이 아니라 여기서 시작·일시정지를 누를 수 있어야 한다. (PRD 4.3)
 */
export function PipView({
  state,
  serverNow,
  background,
  calendar,
  offline,
  onStart,
  onPause,
  onResume,
  onStop,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const session = state.session

  return (
    <div className="pip">
      <WatchCanvas
        state={state}
        serverNow={serverNow}
        canvasRef={canvasRef}
        background={background}
        calendar={calendar}
      />

      <div className="controls controls--pip">
        {!session && (
          <button className="btn btn--primary" disabled={offline} onClick={onStart}>
            시작
          </button>
        )}
        {session?.state === 'running' && (
          <button className="btn" disabled={offline} onClick={onPause}>
            일시정지
          </button>
        )}
        {session?.state === 'paused' && (
          <button className="btn btn--primary" disabled={offline} onClick={onResume}>
            재개
          </button>
        )}
        {session && (
          <button className="btn btn--ghost" disabled={offline} onClick={onStop}>
            정지
          </button>
        )}
      </div>
    </div>
  )
}
