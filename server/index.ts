import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { db } from './db'
import {
  discardSession,
  flush,
  pauseSession,
  resumeSession,
  snapshot,
  startSession,
  stopSession,
  writeSettings,
} from './store'
import { listScreenshots, saveScreenshot, screenshotFile } from './screenshots'
import type { Settings } from '../shared/types'

const PORT = Number(process.env.PORT ?? 3000)
const CLIENT_DIR = 'dist/client'
const FLUSH_INTERVAL_MS = 30_000
const MAX_FIELD_LENGTH = 200
/** 하루보다 긴 목표나 간격은 오타로 본다. */
const MAX_DURATION_MS = 24 * 60 * 60 * 1000
const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024

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
