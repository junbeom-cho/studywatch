import { formatDate, formatElapsed } from '../../shared/time'

/**
 * 스톱워치 표시면을 캔버스에 그린다.
 * 화면 표시 · 스크린샷(FR-2) · PIP(FR-3)가 모두 이 함수 하나를 쓴다.
 */

export const FACE_WIDTH = 1200
export const FACE_HEIGHT = 675

const SANS = "'Pretendard', 'Noto Sans KR', system-ui, 'Segoe UI', sans-serif"
const MONO = "'Cascadia Mono', Consolas, ui-monospace, monospace"

const BG = '#0b0d12'
const TEXT = '#e8ecf4'
const DIM = '#8b94a7'
const ACCENT = '#7aa2ff'
const MUTED = '#5d6478'

const PADDING = 56
const CLOCK_BASELINE = 380

export interface FaceView {
  nickname: string
  courseName: string
  instructorName: string
  elapsedMs: number
  /** 날짜 표시에 쓰는 현재 시각 */
  now: number
  paused: boolean
}

/** 폭을 넘기면 글자 크기를 줄여서 그린다. 긴 강의명이 캔버스 밖으로 나가지 않게. */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: string,
  maxWidth: number,
  x: number,
  y: number,
): void {
  ctx.font = font
  const width = ctx.measureText(text).width
  if (width > maxWidth) {
    const size = Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1])
    if (Number.isFinite(size)) {
      const shrunk = Math.max(12, Math.floor(size * (maxWidth / width)))
      ctx.font = font.replace(/\d+(?:\.\d+)?px/, `${shrunk}px`)
    }
  }
  ctx.fillText(text, x, y)
}

export function drawFace(ctx: CanvasRenderingContext2D, view: FaceView): void {
  ctx.save()
  ctx.clearRect(0, 0, FACE_WIDTH, FACE_HEIGHT)

  ctx.fillStyle = BG
  ctx.fillRect(0, 0, FACE_WIDTH, FACE_HEIGHT)

  // 배경 이미지(FR-4)가 붙기 전까지의 기본 배경
  const glow = ctx.createRadialGradient(
    FACE_WIDTH / 2, FACE_HEIGHT / 2, 0,
    FACE_WIDTH / 2, FACE_HEIGHT / 2, FACE_WIDTH * 0.65,
  )
  glow.addColorStop(0, 'rgba(122, 162, 255, 0.10)')
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, FACE_WIDTH, FACE_HEIGHT)

  // 닉네임 (좌상단) — 비어 있으면 아무것도 그리지 않는다 (PRD 4.6)
  if (view.nickname) {
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillStyle = TEXT
    fitText(ctx, view.nickname, `600 36px ${SANS}`, 480, PADDING, PADDING)
  }

  // 날짜 (우상단)
  ctx.textAlign = 'right'
  ctx.textBaseline = 'top'
  ctx.fillStyle = DIM
  fitText(ctx, formatDate(view.now), `500 32px ${SANS}`, 520, FACE_WIDTH - PADDING, PADDING + 4)

  // 시간 (중앙) — 시:분:초 는 크게, 밀리초는 조금 작게, 둘 다 항상 보인다
  const { clock, millis } = formatElapsed(view.elapsedMs)
  const clockFont = `700 150px ${MONO}`
  const millisFont = `700 78px ${MONO}`
  const millisText = `.${millis}`

  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.font = clockFont
  const clockWidth = ctx.measureText(clock).width
  ctx.font = millisFont
  const millisWidth = ctx.measureText(millisText).width

  let x = (FACE_WIDTH - (clockWidth + millisWidth)) / 2
  ctx.font = clockFont
  ctx.fillStyle = view.paused ? DIM : TEXT
  ctx.fillText(clock, x, CLOCK_BASELINE)
  x += clockWidth
  ctx.font = millisFont
  ctx.fillStyle = view.paused ? MUTED : ACCENT
  ctx.fillText(millisText, x, CLOCK_BASELINE)

  if (view.paused) {
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `600 26px ${SANS}`
    ctx.fillStyle = MUTED
    ctx.fillText('일시정지', FACE_WIDTH / 2, 442)
  }

  // 강의 정보 (하단) — 있는 줄만 아래에서부터 쌓는다
  const lines: Array<{ text: string; font: string; color: string }> = []
  if (view.courseName) lines.push({ text: view.courseName, font: `600 40px ${SANS}`, color: TEXT })
  if (view.instructorName) {
    lines.push({ text: view.instructorName, font: `500 28px ${SANS}`, color: DIM })
  }

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  let y = FACE_HEIGHT - PADDING
  for (const line of [...lines].reverse()) {
    ctx.fillStyle = line.color
    fitText(ctx, line.text, line.font, FACE_WIDTH - PADDING * 2, FACE_WIDTH / 2, y)
    y -= 54
  }

  ctx.restore()
}
