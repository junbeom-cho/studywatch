import { existsSync, unlinkSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { backgroundDir, db } from './db'
import { availableName } from './files'
import type { BackgroundMeta } from '../shared/types'

/** 배경은 골라 쓰는 것이지 모아 두는 것이 아니다. 이 정도면 충분하다. */
export const BACKGROUND_LIMIT = 20

export const ALLOWED_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

interface BackgroundRow {
  id: number
  uploaded_at: number
  filename: string
  mime: string
  byte_size: number
}

const toMeta = (row: BackgroundRow): BackgroundMeta => ({
  id: row.id,
  uploadedAt: row.uploaded_at,
  byteSize: row.byte_size,
})

function rowOf(id: number): BackgroundRow | undefined {
  return db.prepare('SELECT * FROM background WHERE id = ?').get(id) as BackgroundRow | undefined
}

export function listBackgrounds(): BackgroundMeta[] {
  const rows = db.prepare('SELECT * FROM background ORDER BY id DESC').all() as BackgroundRow[]
  return rows.map(toMeta)
}

export function countBackgrounds(): number {
  return (db.prepare('SELECT COUNT(*) AS count FROM background').get() as { count: number }).count
}

export function saveBackground(
  bytes: Uint8Array,
  mime: string,
  uploadedAt: number,
): BackgroundMeta {
  const extension = ALLOWED_MIME[mime] ?? 'bin'
  const filename = availableName(
    backgroundDir,
    `background-${uploadedAt}`,
    extension,
    (name) => db.prepare('SELECT 1 FROM background WHERE filename = ?').get(name) !== undefined,
  )
  writeFileSync(resolve(backgroundDir, filename), bytes)

  const info = db
    .prepare('INSERT INTO background (uploaded_at, filename, mime, byte_size) VALUES (?, ?, ?, ?)')
    .run(uploadedAt, filename, mime, bytes.byteLength)

  return { id: Number(info.lastInsertRowid), uploadedAt, byteSize: bytes.byteLength }
}

export function backgroundFile(id: number): { path: string; mime: string } | null {
  const row = rowOf(id)
  if (!row) return null
  const path = resolve(backgroundDir, row.filename)
  return existsSync(path) ? { path, mime: row.mime } : null
}

/** 지우면서 그 배경을 쓰고 있던 설정도 함께 비운다. 없는 배경을 가리키고 있으면 안 된다. */
export function removeBackground(id: number): boolean {
  const row = rowOf(id)
  if (!row) return false

  const path = resolve(backgroundDir, row.filename)
  db.transaction(() => {
    db.prepare('DELETE FROM background WHERE id = ?').run(id)
    db.prepare('UPDATE settings SET background_id = NULL WHERE background_id = ?').run(id)
  })()
  if (existsSync(path)) unlinkSync(path)
  return true
}
