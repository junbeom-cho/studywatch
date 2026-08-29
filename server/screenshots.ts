import { existsSync, unlinkSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { db, screenshotDir } from './db'
import { availableName } from './files'
import type { ScreenshotMeta } from '../shared/types'

/** 홈서버 볼륨이 무한정 커지지 않게 최근 것만 남긴다. (PRD 6 Q-1) */
export const SCREENSHOT_LIMIT = 50

interface ScreenshotRow {
  id: number
  taken_at: number
  filename: string
  byte_size: number
}

const toMeta = (row: ScreenshotRow): ScreenshotMeta => ({
  id: row.id,
  takenAt: row.taken_at,
  byteSize: row.byte_size,
})

const isRegistered = (name: string): boolean =>
  db.prepare('SELECT 1 FROM screenshot WHERE filename = ?').get(name) !== undefined

/** studywatch-20260830-023301-123.png — 폴더에서 눈으로 훑을 수 있게 시각을 넣는다 */
function filenameFor(takenAt: number): string {
  const d = new Date(takenAt)
  const p = (n: number, width = 2) => String(n).padStart(width, '0')
  const date = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
  const time = `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  const base = `studywatch-${date}-${time}-${p(d.getMilliseconds(), 3)}`
  return availableName(screenshotDir, base, 'png', isRegistered)
}

/** 오래된 것부터 파일과 행을 함께 지운다. 둘 중 하나만 남으면 목록이 깨진다. */
function prune(): void {
  const stale = db
    .prepare(
      `SELECT * FROM screenshot
       WHERE id NOT IN (SELECT id FROM screenshot ORDER BY id DESC LIMIT ?)`,
    )
    .all(SCREENSHOT_LIMIT) as ScreenshotRow[]

  for (const row of stale) {
    const path = resolve(screenshotDir, row.filename)
    if (existsSync(path)) unlinkSync(path)
    db.prepare('DELETE FROM screenshot WHERE id = ?').run(row.id)
  }
}

export function saveScreenshot(bytes: Uint8Array, takenAt: number): ScreenshotMeta {
  const filename = filenameFor(takenAt)
  writeFileSync(resolve(screenshotDir, filename), bytes)

  const info = db
    .prepare('INSERT INTO screenshot (taken_at, filename, byte_size) VALUES (?, ?, ?)')
    .run(takenAt, filename, bytes.byteLength)

  prune()
  return { id: Number(info.lastInsertRowid), takenAt, byteSize: bytes.byteLength }
}

export function listScreenshots(): ScreenshotMeta[] {
  const rows = db.prepare('SELECT * FROM screenshot ORDER BY id DESC').all() as ScreenshotRow[]
  return rows.map(toMeta)
}

/** 파일이 사라졌으면 null. 목록에만 남은 행을 붙잡고 500 을 내지 않는다. */
export function screenshotFile(id: number): string | null {
  const row = db.prepare('SELECT * FROM screenshot WHERE id = ?').get(id) as
    ScreenshotRow | undefined
  if (!row) return null
  const path = resolve(screenshotDir, row.filename)
  return existsSync(path) ? path : null
}
