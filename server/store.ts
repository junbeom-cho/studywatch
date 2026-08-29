import { db } from './db'
import { elapsedMs, studyDateOf } from '../shared/time'
import type { AppState, PauseSpan, SessionSnapshot, Settings } from '../shared/types'

interface SessionRow {
  id: number
  started_at: number
  stopped_at: number | null
  state: 'running' | 'paused' | 'finished'
}

interface PauseRow {
  paused_at: number
  resumed_at: number | null
}

interface SettingsRow {
  nickname: string
  course_name: string
  instructor_name: string
}

/** 아직 끝나지 않은 세션. 동시에 둘 이상 존재하지 않는다. */
function liveRow(): SessionRow | undefined {
  return db
    .prepare("SELECT * FROM session WHERE state != 'finished' ORDER BY id DESC LIMIT 1")
    .get() as SessionRow | undefined
}

function pausesOf(sessionId: number): PauseSpan[] {
  const rows = db
    .prepare('SELECT paused_at, resumed_at FROM pause_span WHERE session_id = ? ORDER BY paused_at')
    .all(sessionId) as PauseRow[]
  return rows.map((row) => ({ pausedAt: row.paused_at, resumedAt: row.resumed_at }))
}

function toSnapshot(row: SessionRow): SessionSnapshot {
  return {
    id: row.id,
    state: row.state === 'paused' ? 'paused' : 'running',
    startedAt: row.started_at,
    pauses: pausesOf(row.id),
  }
}

export function currentSession(): SessionSnapshot | null {
  const row = liveRow()
  return row ? toSnapshot(row) : null
}

export function readSettings(): Settings {
  const row = db
    .prepare('SELECT nickname, course_name, instructor_name FROM settings WHERE id = 1')
    .get() as SettingsRow
  return {
    nickname: row.nickname,
    courseName: row.course_name,
    instructorName: row.instructor_name,
  }
}

export function writeSettings(patch: Partial<Settings>): Settings {
  const next = { ...readSettings(), ...patch }
  db.prepare(
    'UPDATE settings SET nickname = ?, course_name = ?, instructor_name = ? WHERE id = 1',
  ).run(next.nickname.trim(), next.courseName.trim(), next.instructorName.trim())
  return readSettings()
}

/**
 * 해당 학습일의 누적 시간을 원본(session + pause_span)에서 다시 계산한다.
 * daily_study 는 파생 데이터라 몇 번을 돌려도 같은 값이 나온다. (PRD 5.2)
 */
export function recomputeDate(date: string, now: number): void {
  const sessions = db.prepare('SELECT * FROM session').all() as SessionRow[]
  let total = 0

  for (const session of sessions) {
    // 세션은 쪼개지 않는다. 시작한 날에 통째로 붙는다.
    if (studyDateOf(session.started_at) !== date) continue
    total += elapsedMs(session.started_at, pausesOf(session.id), session.stopped_at ?? now)
  }

  db.prepare(`
    INSERT INTO daily_study (study_date, total_ms) VALUES (?, ?)
    ON CONFLICT(study_date) DO UPDATE SET total_ms = excluded.total_ms
  `).run(date, total)
}

/** 진행 중인 세션을 집계에 반영한다. */
export function flush(now: number): void {
  const row = liveRow()
  if (!row) return
  recomputeDate(studyDateOf(row.started_at), now)
}

export function startSession(now: number): void {
  if (liveRow()) return // 이미 돌아가는 중이면 아무것도 하지 않는다
  db.prepare("INSERT INTO session (started_at, state) VALUES (?, 'running')").run(now)
}

export function pauseSession(now: number): void {
  const row = liveRow()
  if (!row || row.state !== 'running') return
  db.transaction(() => {
    db.prepare('INSERT INTO pause_span (session_id, paused_at) VALUES (?, ?)').run(row.id, now)
    db.prepare("UPDATE session SET state = 'paused' WHERE id = ?").run(row.id)
  })()
  recomputeDate(studyDateOf(row.started_at), now)
}

export function resumeSession(now: number): void {
  const row = liveRow()
  if (!row || row.state !== 'paused') return
  db.transaction(() => {
    db.prepare(
      'UPDATE pause_span SET resumed_at = ? WHERE session_id = ? AND resumed_at IS NULL',
    ).run(now, row.id)
    db.prepare("UPDATE session SET state = 'running' WHERE id = ?").run(row.id)
  })()
}

/** 정지 = 기록을 확정하고 세션을 끝낸다. 다음 시작은 0부터다. */
export function stopSession(now: number): void {
  const row = liveRow()
  if (!row) return
  db.transaction(() => {
    db.prepare(
      'UPDATE pause_span SET resumed_at = ? WHERE session_id = ? AND resumed_at IS NULL',
    ).run(now, row.id)
    db.prepare("UPDATE session SET state = 'finished', stopped_at = ? WHERE id = ?").run(now, row.id)
  })()
  recomputeDate(studyDateOf(row.started_at), now)
}

/** 버리기 = 이번 세션을 기록에 남기지 않고 지운다. pause_span 은 CASCADE 로 함께 지워진다. */
export function discardSession(now: number): void {
  const row = liveRow()
  if (!row) return
  const date = studyDateOf(row.started_at)
  db.prepare('DELETE FROM session WHERE id = ?').run(row.id)
  recomputeDate(date, now)
}

export function snapshot(now: number): AppState {
  return { serverNow: now, session: currentSession(), settings: readSettings() }
}
