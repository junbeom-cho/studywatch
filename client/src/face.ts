import { monthGrid } from '../../shared/month'
import { formatDate, formatElapsed } from '../../shared/time'
import { levelOf } from './calendarGrid'

/**
 * 스톱워치 표시면. 인증 스크린샷 한 장에 들어가야 할 것이 모두 여기 있다 —
 * 누가 · 무슨 강의를 · 언제 · 얼마나 · 그리고 이번 달을 얼마나 이어왔는지.
 *
 * 화면 표시 · 스크린샷(FR-2) · PIP(FR-3)가 모두 이 함수 하나를 쓴다.
 */

export const FACE_WIDTH = 1600
export const FACE_HEIGHT = 900

const SANS = "'Pretendard', 'Noto Sans KR', system-ui, 'Segoe UI', sans-serif"
const MONO = "'Cascadia Mono', Consolas, ui-monospace, monospace"

const BG = '#0b0d12'
const TEXT = '#e8ecf4'
const DIM = '#8b94a7'
const ACCENT = '#00c471'
const MUTED = '#5d6478'
const SCRIM = 'rgba(6, 8, 14, 0.55)'

const PADDING = 64
const LEFT_END = 1030
const LEFT_CENTER = LEFT_END / 2
const LEFT_WIDTH = LEFT_END - PADDING * 2
const RIGHT_X = 1062
const RIGHT_WIDTH = FACE_WIDTH - PADDING - RIGHT_X

const CELL = 58
const GAP = 11
const GRID_TOP = 226
const CLOCK_BASELINE = 470

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** 작심삼일을 넘겼다는 표시. 하루 이틀에 붙이면 의미가 없다. */
const STREAK_FIRE_FROM = 3

/** 칸 색. 0 단계는 어떤 배경 위에서도 보이도록 반투명으로 둔다. */
const LEVEL_FILL = ['rgba(255, 255, 255, 0.07)', '#006c3e', '#00894f', '#00a760', '#00c471']

export interface FaceCalendar {
  year: number
  month: number
  today: string
  totals: Record<string, number>
  streak: number
}

export interface FaceView {
  nickname: string
  courseName: string
  instructorName: string
  elapsedMs: number
  /** 날짜 표시에 쓰는 현재 시각 */
  now: number
  paused: boolean
  background: HTMLImageElement | null
  calendar: FaceCalendar | null
}

/** 비율을 지키며 화면을 꽉 채운다. 넘치는 쪽은 잘린다. */
function drawCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement): void {
  const scale = Math.max(FACE_WIDTH / image.naturalWidth, FACE_HEIGHT / image.naturalHeight)
  const width = image.naturalWidth * scale
  const height = image.naturalHeight * scale
  ctx.drawImage(image, (FACE_WIDTH - width) / 2, (FACE_HEIGHT - height) / 2, width, height)
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

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, width, height, radius)
  else ctx.rect(x, y, width, height)
}

/** 시:분:초는 크게, 밀리초는 조금 작게. 둘 다 항상 보인다. */
function drawClock(ctx: CanvasRenderingContext2D, view: FaceView): void {
  const { clock, millis } = formatElapsed(view.elapsedMs)
  const millisText = `.${millis}`
  let clockSize = 152
  let millisSize = 78

  const measure = () => {
    ctx.font = `700 ${clockSize}px ${MONO}`
    const clockWidth = ctx.measureText(clock).width
    ctx.font = `700 ${millisSize}px ${MONO}`
    return { clockWidth, millisWidth: ctx.measureText(millisText).width }
  }

  let sizes = measure()
  if (sizes.clockWidth + sizes.millisWidth > LEFT_WIDTH) {
    // 100시간을 넘겨 자릿수가 늘어나면 줄여서 맞춘다
    const scale = LEFT_WIDTH / (sizes.clockWidth + sizes.millisWidth)
    clockSize = Math.floor(clockSize * scale)
    millisSize = Math.floor(millisSize * scale)
    sizes = measure()
  }

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  let x = LEFT_CENTER - (sizes.clockWidth + sizes.millisWidth) / 2

  ctx.font = `700 ${clockSize}px ${MONO}`
  ctx.fillStyle = view.paused ? DIM : TEXT
  ctx.fillText(clock, x, CLOCK_BASELINE)

  x += sizes.clockWidth
  ctx.font = `700 ${millisSize}px ${MONO}`
  ctx.fillStyle = view.paused ? MUTED : ACCENT
  ctx.fillText(millisText, x, CLOCK_BASELINE)
}

function drawMonth(ctx: CanvasRenderingContext2D, calendar: FaceCalendar): void {
  const grid = monthGrid(calendar.year, calendar.month)

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = TEXT
  ctx.font = `600 38px ${SANS}`
  ctx.fillText(grid.label, RIGHT_X, 150)

  ctx.textAlign = 'center'
  ctx.font = `500 20px ${SANS}`
  ctx.fillStyle = DIM
  WEEKDAYS.forEach((label, index) => {
    ctx.fillText(label, RIGHT_X + index * (CELL + GAP) + CELL / 2, 200)
  })

  grid.weeks.forEach((week, row) => {
    week.forEach((date, column) => {
      if (!date) return
      const x = RIGHT_X + column * (CELL + GAP)
      const y = GRID_TOP + row * (CELL + GAP)
      const level = levelOf(calendar.totals[date] ?? 0)

      ctx.fillStyle = LEVEL_FILL[level] ?? 'transparent'
      roundedRect(ctx, x, y, CELL, CELL, 10)
      ctx.fill()

      if (date === calendar.today) {
        ctx.strokeStyle = TEXT
        ctx.lineWidth = 2
        roundedRect(ctx, x - 3, y - 3, CELL + 6, CELL + 6, 13)
        ctx.stroke()
      }

      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = `600 20px ${SANS}`
      // 밝은 칸 위에서는 어두운 글씨라야 읽힌다
      ctx.fillStyle = level >= 3 ? '#05130c' : level === 0 ? MUTED : TEXT
      ctx.fillText(String(Number(date.slice(8))), x + CELL / 2, y + CELL / 2 + 1)
    })
  })

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `700 42px ${SANS}`
  ctx.fillStyle = calendar.streak > 0 ? ACCENT : MUTED

  const streakLabel = calendar.streak > 0 ? `연속 ${calendar.streak}일` : '연속 기록 없음'
  const fire = calendar.streak >= STREAK_FIRE_FROM ? '🔥 ' : ''
  ctx.fillText(fire + streakLabel, RIGHT_X, 716)
}

export function drawFace(ctx: CanvasRenderingContext2D, view: FaceView): void {
  ctx.save()
  ctx.clearRect(0, 0, FACE_WIDTH, FACE_HEIGHT)

  ctx.fillStyle = BG
  ctx.fillRect(0, 0, FACE_WIDTH, FACE_HEIGHT)

  const hasBackground = Boolean(view.background?.complete && view.background.naturalWidth > 0)

  if (hasBackground && view.background) {
    drawCover(ctx, view.background)
    // 어떤 사진을 올려도 시간이 읽히도록 덮는다 (PRD 4.4)
    ctx.fillStyle = SCRIM
    ctx.fillRect(0, 0, FACE_WIDTH, FACE_HEIGHT)
  } else {
    const glow = ctx.createRadialGradient(
      LEFT_CENTER,
      FACE_HEIGHT / 2,
      0,
      LEFT_CENTER,
      FACE_HEIGHT / 2,
      FACE_WIDTH * 0.55,
    )
    glow.addColorStop(0, 'rgba(0, 196, 113, 0.10)')
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, FACE_WIDTH, FACE_HEIGHT)
  }

  // 사진 위에서는 흐린 색 글자가 묻힌다. 스크림을 더 어둡게 하면 사진이 죽으므로
  // 글자에만 그림자를 넣는다. 배경이 없을 때는 필요 없다.
  if (hasBackground) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)'
    ctx.shadowBlur = 16
    ctx.shadowOffsetY = 2
  }

  // 닉네임 (좌상단) — 비어 있으면 아무것도 그리지 않는다 (PRD 4.6)
  if (view.nickname) {
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillStyle = TEXT
    fitText(ctx, view.nickname, `600 46px ${SANS}`, LEFT_WIDTH, PADDING, PADDING)
  }

  // 날짜 (우상단)
  ctx.textAlign = 'right'
  ctx.textBaseline = 'top'
  ctx.fillStyle = DIM
  fitText(
    ctx,
    formatDate(view.now),
    `500 30px ${SANS}`,
    RIGHT_WIDTH,
    FACE_WIDTH - PADDING,
    PADDING + 8,
  )

  drawClock(ctx, view)

  if (view.paused) {
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `600 30px ${SANS}`
    ctx.fillStyle = MUTED
    ctx.fillText('일시정지', LEFT_CENTER, 552)
  }

  // 강의 정보 (왼쪽 아래) — 있는 줄만 아래에서부터 쌓는다
  const lines: Array<{ text: string; font: string; color: string }> = []
  if (view.courseName) lines.push({ text: view.courseName, font: `600 48px ${SANS}`, color: TEXT })
  if (view.instructorName) {
    lines.push({ text: view.instructorName, font: `500 34px ${SANS}`, color: DIM })
  }

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  let y = FACE_HEIGHT - PADDING - 26
  for (const line of [...lines].reverse()) {
    ctx.fillStyle = line.color
    fitText(ctx, line.text, line.font, LEFT_WIDTH, LEFT_CENTER, y)
    y -= 64
  }

  if (view.calendar) drawMonth(ctx, view.calendar)

  ctx.restore()
}
