import { monthGrid } from '../../shared/month'
import { formatDate, formatDuration, formatElapsed } from '../../shared/time'
import type { Theme } from '../../shared/types'
import { levelOf } from './calendarGrid'
import { paletteOf, type Palette } from './palette'

/**
 * 스톱워치 표시면. 인증 스크린샷 한 장에 들어가야 할 것이 모두 여기 있다 —
 * 누가 · 무슨 강의를 · 언제 · 얼마나 · 그리고 이번 달을 얼마나 이어왔는지.
 *
 * 화면 표시 · 스크린샷(FR-2) · PIP(FR-3)가 모두 이 함수 하나를 쓴다.
 */

export const FACE_WIDTH = 1600
export const FACE_HEIGHT = 900

// styles.css 와 같은 스택을 쓴다. main.tsx 가 두 폰트를 실제로 싣는다 —
// 부르기만 하면 기기마다 다른 폰트로 그려지고, 그게 그대로 인증샷에 찍힌다.
const SANS = "'Pretendard Variable', 'Pretendard', system-ui, 'Segoe UI', sans-serif"
const MONO = "'JetBrains Mono Variable', ui-monospace, Consolas, monospace"

const PADDING = 64
const LEFT_END = 1030
const LEFT_CENTER = LEFT_END / 2
const LEFT_WIDTH = LEFT_END - PADDING * 2
const LEFT_X = LEFT_CENTER - LEFT_WIDTH / 2
const RIGHT_X = 1062
const RIGHT_WIDTH = FACE_WIDTH - PADDING - RIGHT_X

/**
 * 가로선 하나와 세로선 하나로 화면을 나눈다. 닉네임과 날짜는 가로선 위 같은
 * 기준선에 앉히고, 시계와 달력은 그 아래 두 칸으로 나눠 넣는다. 선이 없으면
 * 두 덩어리를 그냥 붙여 놓은 것처럼 보인다.
 */
const HEADER_BASELINE = 108
const RULE_Y = 152
const BODY_BOTTOM = FACE_HEIGHT - PADDING
const DIVIDER_X = (LEFT_END + RIGHT_X) / 2

const CLOCK_BASELINE = 452
const PAUSE_Y = 512
const GOAL_BAR_Y = 560
const GOAL_BAR_HEIGHT = 8
const GOAL_LABEL_Y = 606

const CELL = 58
const GAP = 11
const MONTH_LABEL_Y = 212
const WEEKDAY_Y = 262
const GRID_TOP = 288
/** 연속 일수는 격자 아래에 붙인다. 떨어뜨려 두면 달력의 요약이라는 것이 안 읽힌다. */
const STREAK_GAP = 62

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** 작심삼일을 넘겼다는 표시. 하루 이틀에 붙이면 의미가 없다. */
const STREAK_STRONG_FROM = 3

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
  /** 목표 시간. null 이면 진행 막대를 그리지 않는다. (PRD 4.5) */
  goalMs: number | null
  /** 날짜 표시에 쓰는 현재 시각 */
  now: number
  paused: boolean
  background: HTMLImageElement | null
  calendar: FaceCalendar | null
  theme: Theme
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

/** 헤더 아래 가로선, 시계와 달력 사이 세로선. 0.5 를 더해야 1px 로 또렷하게 나온다. */
function drawRules(ctx: CanvasRenderingContext2D, palette: Palette): void {
  ctx.strokeStyle = palette.line
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(PADDING, RULE_Y + 0.5)
  ctx.lineTo(FACE_WIDTH - PADDING, RULE_Y + 0.5)
  ctx.moveTo(DIVIDER_X + 0.5, RULE_Y + 32)
  ctx.lineTo(DIVIDER_X + 0.5, BODY_BOTTOM)
  ctx.stroke()
}

/**
 * 목표까지 얼마나 왔는지. 목표를 안 잡았으면 아무것도 그리지 않는다 —
 * 왼쪽이 비어 보인다고 없는 값을 지어내지 않는다. (PRD 4.6)
 */
function drawGoal(ctx: CanvasRenderingContext2D, view: FaceView, palette: Palette): void {
  if (!view.goalMs || view.goalMs <= 0) return

  const ratio = Math.min(1, view.elapsedMs / view.goalMs)
  const reached = ratio >= 1

  ctx.fillStyle = palette.track
  roundedRect(ctx, LEFT_X, GOAL_BAR_Y, LEFT_WIDTH, GOAL_BAR_HEIGHT, GOAL_BAR_HEIGHT / 2)
  ctx.fill()

  if (ratio > 0) {
    // 시작 직후에도 막대가 보이도록 최소 길이를 준다
    ctx.fillStyle = view.paused ? palette.muted : palette.accent
    const width = Math.max(GOAL_BAR_HEIGHT, LEFT_WIDTH * ratio)
    roundedRect(ctx, LEFT_X, GOAL_BAR_Y, width, GOAL_BAR_HEIGHT, GOAL_BAR_HEIGHT / 2)
    ctx.fill()
  }

  ctx.font = `600 24px ${SANS}`
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.fillStyle = reached ? palette.accent : palette.dim
  ctx.fillText(reached ? '목표 달성' : `${Math.floor(ratio * 100)}%`, LEFT_X, GOAL_LABEL_Y)

  ctx.textAlign = 'right'
  ctx.fillStyle = palette.dim
  ctx.fillText(`목표 ${formatDuration(view.goalMs)}`, LEFT_X + LEFT_WIDTH, GOAL_LABEL_Y)
}

/** 시:분:초는 크게, 밀리초는 조금 작게. 둘 다 항상 보인다. */
function drawClock(ctx: CanvasRenderingContext2D, view: FaceView, palette: Palette): void {
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
  ctx.fillStyle = view.paused ? palette.dim : palette.text
  ctx.fillText(clock, x, CLOCK_BASELINE)

  x += sizes.clockWidth
  ctx.font = `700 ${millisSize}px ${MONO}`
  ctx.fillStyle = view.paused ? palette.muted : palette.accent
  ctx.fillText(millisText, x, CLOCK_BASELINE)
}

function drawMonth(ctx: CanvasRenderingContext2D, calendar: FaceCalendar, palette: Palette): void {
  const grid = monthGrid(calendar.year, calendar.month)

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = palette.text
  ctx.font = `600 38px ${SANS}`
  ctx.fillText(grid.label, RIGHT_X, MONTH_LABEL_Y)

  ctx.textAlign = 'center'
  ctx.font = `500 20px ${SANS}`
  ctx.fillStyle = palette.dim
  WEEKDAYS.forEach((label, index) => {
    ctx.fillText(label, RIGHT_X + index * (CELL + GAP) + CELL / 2, WEEKDAY_Y)
  })

  grid.weeks.forEach((week, row) => {
    week.forEach((date, column) => {
      if (!date) return
      const x = RIGHT_X + column * (CELL + GAP)
      const y = GRID_TOP + row * (CELL + GAP)
      const level = levelOf(calendar.totals[date] ?? 0)

      ctx.fillStyle = palette.levelFill[level] ?? 'transparent'
      roundedRect(ctx, x, y, CELL, CELL, 10)
      ctx.fill()

      if (date === calendar.today) {
        ctx.strokeStyle = palette.text
        ctx.lineWidth = 2
        roundedRect(ctx, x - 3, y - 3, CELL + 6, CELL + 6, 13)
        ctx.stroke()
      }

      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = `600 20px ${SANS}`
      // 칸 색에 따라 읽히는 글자색이 다르다. 테마마다 뒤집힌다.
      ctx.fillStyle = palette.levelText[level] ?? palette.text
      ctx.fillText(String(Number(date.slice(8))), x + CELL / 2, y + CELL / 2 + 1)
    })
  })

  // 이모지는 기기마다 다른 그림으로 그려진다. 인증 스크린샷에는 색 계층으로만 강조한다.
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `700 42px ${SANS}`
  if (calendar.streak >= STREAK_STRONG_FROM) ctx.fillStyle = palette.accent
  else if (calendar.streak > 0) ctx.fillStyle = palette.dim
  else ctx.fillStyle = palette.muted

  ctx.fillText(
    calendar.streak > 0 ? `연속 ${calendar.streak}일` : '연속 기록 없음',
    RIGHT_X,
    GRID_TOP + grid.weeks.length * (CELL + GAP) + STREAK_GAP,
  )
}

export function drawFace(ctx: CanvasRenderingContext2D, view: FaceView): void {
  const palette = paletteOf(view.theme)

  ctx.save()
  ctx.clearRect(0, 0, FACE_WIDTH, FACE_HEIGHT)

  ctx.fillStyle = palette.bg
  ctx.fillRect(0, 0, FACE_WIDTH, FACE_HEIGHT)

  const hasBackground = Boolean(view.background?.complete && view.background.naturalWidth > 0)

  if (hasBackground && view.background) {
    drawCover(ctx, view.background)
    // 어떤 사진을 올려도 시간이 읽히도록 덮는다 (PRD 4.4)
    ctx.fillStyle = palette.scrim
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
    glow.addColorStop(0, palette.glow)
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, FACE_WIDTH, FACE_HEIGHT)
  }

  // 사진 위에서는 흐린 색 글자가 묻힌다. 스크림을 더 어둡게 하면 사진이 죽으므로
  // 글자에만 그림자를 넣는다. 배경이 없을 때는 필요 없다.
  if (hasBackground) {
    ctx.shadowColor = palette.shadow
    ctx.shadowBlur = 16
    ctx.shadowOffsetY = 2
  }

  drawRules(ctx, palette)

  // 닉네임 (좌상단) — 비어 있으면 아무것도 그리지 않는다 (PRD 4.6)
  if (view.nickname) {
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = palette.text
    fitText(ctx, view.nickname, `600 46px ${SANS}`, LEFT_WIDTH, PADDING, HEADER_BASELINE)
  }

  // 날짜 (우상단) — 닉네임과 같은 기준선에 앉힌다
  ctx.textAlign = 'right'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = palette.dim
  fitText(
    ctx,
    formatDate(view.now),
    `500 30px ${SANS}`,
    RIGHT_WIDTH,
    FACE_WIDTH - PADDING,
    HEADER_BASELINE,
  )

  drawClock(ctx, view, palette)

  if (view.paused) {
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `600 30px ${SANS}`
    ctx.fillStyle = palette.muted
    ctx.fillText('일시정지', LEFT_CENTER, PAUSE_Y)
  }

  drawGoal(ctx, view, palette)

  // 강의 정보 (왼쪽 아래) — 있는 줄만 아래에서부터 쌓는다
  const lines: Array<{ text: string; font: string; color: string }> = []
  if (view.courseName) {
    lines.push({ text: view.courseName, font: `600 48px ${SANS}`, color: palette.text })
  }
  if (view.instructorName) {
    lines.push({ text: view.instructorName, font: `500 34px ${SANS}`, color: palette.dim })
  }

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  let y = FACE_HEIGHT - PADDING - 26
  for (const line of [...lines].reverse()) {
    ctx.fillStyle = line.color
    fitText(ctx, line.text, line.font, LEFT_WIDTH, LEFT_CENTER, y)
    y -= 64
  }

  if (view.calendar) drawMonth(ctx, view.calendar, palette)

  ctx.restore()
}
