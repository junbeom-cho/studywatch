import { useEffect, useRef, type RefObject } from 'react'
import { elapsedMs } from '../../shared/time'
import type { AppState } from '../../shared/types'
import { FACE_HEIGHT, FACE_WIDTH, drawFace, type FaceCalendar } from './face'

interface Props {
  state: AppState
  serverNow: () => number
  /** 스크린샷(FR-2)이 같은 캔버스를 써야 해서 소유권을 위로 올렸다 */
  canvasRef: RefObject<HTMLCanvasElement | null>
  background: HTMLImageElement | null
  calendar: FaceCalendar | null
}

const MAX_DPR = 3

export function WatchCanvas({ state, serverNow, canvasRef, background, calendar }: Props) {
  // rAF 루프는 한 번만 만들고, 최신 값은 ref 로 읽는다
  const latest = useRef({ state, serverNow, background, calendar })
  latest.current = { state, serverNow, background, calendar }

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    // PIP 창(FR-3)에 그려질 때는 그 창의 rAF 를 써야 한다. 본 창이 뒤로 가면
    // 본 창의 rAF 는 멈추기 때문이다. 캔버스가 어느 문서에 있는지에서 유도한다.
    const host = canvas.ownerDocument.defaultView ?? window

    let frame = 0
    const render = () => {
      const { state, serverNow, background, calendar } = latest.current
      const dpr = Math.min(host.devicePixelRatio || 1, MAX_DPR)
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
        calendar,
        theme: state.settings.theme,
      })

      frame = host.requestAnimationFrame(render)
    }

    // 첫 프레임을 기다리지 않고 바로 한 번 그린다. 로드 직후 스크린샷을 찍으면
    // 아직 아무것도 안 그려진 빈 캔버스가 저장된다.
    render()
    return () => host.cancelAnimationFrame(frame)
  }, [canvasRef])

  return <canvas ref={canvasRef} className="face" width={FACE_WIDTH} height={FACE_HEIGHT} />
}
