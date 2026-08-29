import { useEffect, useRef, type RefObject } from 'react'
import { elapsedMs } from '../../shared/time'
import type { AppState } from '../../shared/types'
import { FACE_HEIGHT, FACE_WIDTH, drawFace } from './face'

interface Props {
  state: AppState
  serverNow: () => number
  /** 스크린샷(FR-2)이 같은 캔버스를 써야 해서 소유권을 위로 올렸다 */
  canvasRef: RefObject<HTMLCanvasElement | null>
  background: HTMLImageElement | null
}

const MAX_DPR = 3

export function WatchCanvas({ state, serverNow, canvasRef, background }: Props) {
  // rAF 루프는 한 번만 만들고, 최신 값은 ref 로 읽는다
  const latest = useRef({ state, serverNow, background })
  latest.current = { state, serverNow, background }

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    let frame = 0
    const render = () => {
      const { state, serverNow, background } = latest.current
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      const width = Math.round(FACE_WIDTH * dpr)
      const height = Math.round(FACE_HEIGHT * dpr)
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const now = serverNow()
      const session = state.session
      drawFace(ctx, {
        nickname: state.settings.nickname,
        courseName: state.settings.courseName,
        instructorName: state.settings.instructorName,
        elapsedMs: session ? elapsedMs(session.startedAt, session.pauses, now) : 0,
        now,
        paused: session?.state === 'paused',
        background,
      })

      frame = requestAnimationFrame(render)
    }

    frame = requestAnimationFrame(render)
    return () => cancelAnimationFrame(frame)
  }, [canvasRef])

  return <canvas ref={canvasRef} className="face" width={FACE_WIDTH} height={FACE_HEIGHT} />
}
