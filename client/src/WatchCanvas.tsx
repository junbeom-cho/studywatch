import { useEffect, useRef } from 'react'
import { elapsedMs } from '../../shared/time'
import type { AppState } from '../../shared/types'
import { FACE_HEIGHT, FACE_WIDTH, drawFace } from './face'

interface Props {
  state: AppState
  serverNow: () => number
}

const MAX_DPR = 3

export function WatchCanvas({ state, serverNow }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // rAF 루프는 한 번만 만들고, 최신 값은 ref 로 읽는다
  const latest = useRef({ state, serverNow })
  latest.current = { state, serverNow }

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    let frame = 0
    const render = () => {
      const { state, serverNow } = latest.current
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
      })

      frame = requestAnimationFrame(render)
    }

    frame = requestAnimationFrame(render)
    return () => cancelAnimationFrame(frame)
  }, [])

  return <canvas ref={canvasRef} className="face" width={FACE_WIDTH} height={FACE_HEIGHT} />
}
