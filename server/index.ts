import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { existsSync, readFileSync } from 'node:fs'
import { shiftStudyDate, studyDateOf } from '../shared/time'
import { resolve } from 'node:path'
import { db } from './db'
import {
  discardSession,
  flush,
  studyTotals,
  pauseSession,
  resumeSession,
  snapshot,
  startSession,
  stopSession,
  writeSettings,
} from './store'
import {
  ALLOWED_MIME,
  BACKGROUND_LIMIT,
  backgroundFile,
  countBackgrounds,
  listBackgrounds,
  removeBackground,
  saveBackground,
} from './backgrounds'
import { listScreenshots, saveScreenshot, screenshotFile } from './screenshots'
import type { Settings } from '../shared/types'

const PORT = Number(process.env.PORT ?? 3000)
const CLIENT_DIR = 'dist/client'
const FLUSH_INTERVAL_MS = 30_000
const MAX_FIELD_LENGTH = 200
/** 하루보다 긴 목표나 간격은 오타로 본다. */
const MAX_DURATION_MS = 24 * 60 * 60 * 1000
const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024
const MAX_BACKGROUND_BYTES = 8 * 1024 * 1024
const CALENDAR_DAYS = 182
const MAX_CALENDAR_DAYS = 366

const app = new Hono()

app.get('/api/state', (c) => c.json(snapshot(Date.now())))

app.put('/api/settings', async (c) => {
  const body = (await c.req.json().catch(() => null)) as Partial<Settings> | null
  if (!body) return c.json({ error: '본문을 읽을 수 없다' }, 400)

  const patch: Partial<Settings> = {}

  for (const key of ['nickname', 'courseName', 'instructorName'] as const) {
    const value = body[key]
    if (value === undefined) continue
    if (typeof value !== 'string') return c.json({ error: `${key} 는 문자열이어야 한다` }, 400)
    if (value.length > MAX_FIELD_LENGTH) {
      return c.json({ error: `${key} 는 ${MAX_FIELD_LENGTH}자를 넘을 수 없다` }, 400)
    }
    patch[key] = value
  }

  // null 은 "알림 꺼짐" 이라는 뜻이므로 유효한 값이다 (PRD 4.5)
  for (const key of ['goalMs', 'intervalMs'] as const) {
    const value = body[key]
    if (value === undefined) continue
    if (value === null) {
      patch[key] = null
      continue
    }
    if (!Number.isInteger(value) || value <= 0 || value > MAX_DURATION_MS) {
      return c.json({ error: `${key} 는 1 이상 ${MAX_DURATION_MS} 이하의 정수여야 한다` }, 400)
    }
    patch[key] = value
  }

  if (body.backgroundId !== undefined) {
    const value = body.backgroundId
    if (value !== null && (!Number.isInteger(value) || value <= 0)) {
      return c.json({ error: 'backgroundId 는 양의 정수이거나 null 이어야 한다' }, 400)
    }
    if (value !== null && !backgroundFile(value)) {
      return c.json({ error: '없는 배경이다' }, 404)
    }
    patch.backgroundId = value
  }

  if (body.soundEnabled !== undefined) {
    if (typeof body.soundEnabled !== 'boolean') {
      return c.json({ error: 'soundEnabled 는 참/거짓이어야 한다' }, 400)
    }
    patch.soundEnabled = body.soundEnabled
  }

  writeSettings(patch)
  return c.json(snapshot(Date.now()))
})

const actions = {
  start: startSession,
  pause: pauseSession,
  resume: resumeSession,
  stop: stopSession,
  discard: discardSession,
} as const

app.post('/api/session/:action', (c) => {
  const action = c.req.param('action')
  // 상속 프로퍼티(toString 등)가 뚫고 들어오지 않게 자기 키만 본다
  if (!Object.hasOwn(actions, action)) return c.json({ error: `모르는 동작: ${action}` }, 404)
  const run = actions[action as keyof typeof actions]

  const now = Date.now()
  run(now)
  return c.json(snapshot(now))
})

app.post('/api/backgrounds', async (c) => {
  const mime = (c.req.header('content-type') ?? '').split(';')[0]?.trim() ?? ''
  if (!(mime in ALLOWED_MIME)) {
    return c.json({ error: `PNG · JPEG · WebP 만 받는다 (${mime || '형식 없음'})` }, 415)
  }
  if (countBackgrounds() >= BACKGROUND_LIMIT) {
    return c.json({ error: `배경은 ${BACKGROUND_LIMIT}장까지다. 쓰지 않는 것을 지운다.` }, 409)
  }

  const body = await c.req.arrayBuffer()
  if (body.byteLength === 0) return c.json({ error: '빈 파일이다' }, 400)
  if (body.byteLength > MAX_BACKGROUND_BYTES) return c.json({ error: '파일이 너무 크다' }, 413)

  return c.json(saveBackground(new Uint8Array(body), mime, Date.now()), 201)
})

app.get('/api/backgrounds', (c) => c.json(listBackgrounds()))

app.get('/api/backgrounds/:id', (c) => {
  const id = Number(c.req.param('id'))
  const found = Number.isInteger(id) ? backgroundFile(id) : null
  if (!found) return c.json({ error: '없는 배경이다' }, 404)
  return new Response(readFileSync(found.path), { headers: { 'content-type': found.mime } })
})

app.delete('/api/backgrounds/:id', (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || !removeBackground(id)) {
    return c.json({ error: '없는 배경이다' }, 404)
  }
  return c.json(snapshot(Date.now()))
})

app.get('/api/calendar', (c) => {
  const now = Date.now()
  // 진행 중인 세션을 먼저 반영해야 오늘 칸이 최신이다
  flush(now)

  const requested = Number(c.req.query('days') ?? CALENDAR_DAYS)
  const days = Number.isInteger(requested)
    ? Math.min(Math.max(requested, 1), MAX_CALENDAR_DAYS)
    : CALENDAR_DAYS

  const today = studyDateOf(now)
  const from = shiftStudyDate(today, -(days - 1))
  return c.json({ today, from, to: today, totals: studyTotals(from, today) })
})

app.post('/api/screenshots', async (c) => {
  if (!(c.req.header('content-type') ?? '').startsWith('image/png')) {
    return c.json({ error: 'PNG 만 받는다' }, 415)
  }

  const body = await c.req.arrayBuffer()
  if (body.byteLength === 0) return c.json({ error: '빈 파일이다' }, 400)
  if (body.byteLength > MAX_SCREENSHOT_BYTES) return c.json({ error: '파일이 너무 크다' }, 413)

  return c.json(saveScreenshot(new Uint8Array(body), Date.now()), 201)
})

app.get('/api/screenshots', (c) => c.json(listScreenshots()))

app.get('/api/screenshots/:id', (c) => {
  const id = Number(c.req.param('id'))
  const file = Number.isInteger(id) ? screenshotFile(id) : null
  if (!file) return c.json({ error: '없는 스크린샷이다' }, 404)
  return new Response(readFileSync(file), { headers: { 'content-type': 'image/png' } })
})

// 빌드된 프론트가 있으면 같은 포트에서 함께 서빙한다. 컨테이너를 하나로 유지하기 위해서다.
if (existsSync(resolve(process.cwd(), CLIENT_DIR))) {
  app.use('/*', serveStatic({ root: CLIENT_DIR }))
  app.get('*', serveStatic({ path: `${CLIENT_DIR}/index.html` }))
} else {
  app.get('/', (c) =>
    c.text(
      '빌드된 프론트가 없다. 개발 중이면 http://localhost:5173 을, 아니면 npm run build 를 쓴다.',
    ),
  )
}

// 탭이 갑자기 닫혀도 기록이 남도록 진행 중인 세션을 주기적으로 집계에 반영한다.
const flushTimer = setInterval(() => flush(Date.now()), FLUSH_INTERVAL_MS)

const server = serve({ fetch: app.fetch, port: PORT, hostname: '0.0.0.0' }, (info) => {
  console.log(`StudyWatch listening on http://localhost:${info.port}`)
})

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    clearInterval(flushTimer)
    flush(Date.now())
    db.close()
    server.close(() => process.exit(0))
  })
}
