import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

export const dataDir = process.env.DATA_DIR ?? resolve(process.cwd(), 'data')
export const screenshotDir = resolve(dataDir, 'screenshots')
mkdirSync(screenshotDir, { recursive: true })

export const db = new Database(resolve(dataDir, 'studywatch.db'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    id              INTEGER PRIMARY KEY CHECK (id = 1),
    nickname        TEXT NOT NULL DEFAULT '',
    course_name     TEXT NOT NULL DEFAULT '',
    instructor_name TEXT NOT NULL DEFAULT '',
    goal_ms         INTEGER,
    interval_ms     INTEGER,
    sound_enabled   INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS session (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at INTEGER NOT NULL,
    stopped_at INTEGER,
    state      TEXT NOT NULL CHECK (state IN ('running', 'paused', 'finished'))
  );

  CREATE TABLE IF NOT EXISTS pause_span (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES session(id) ON DELETE CASCADE,
    paused_at  INTEGER NOT NULL,
    resumed_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS daily_study (
    study_date TEXT PRIMARY KEY,
    total_ms   INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS screenshot (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    taken_at  INTEGER NOT NULL,
    filename  TEXT NOT NULL UNIQUE,
    byte_size INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_pause_span_session ON pause_span (session_id);
  CREATE INDEX IF NOT EXISTS idx_session_state ON session (state);
`)

/** 이미 만들어진 DB 에 컬럼을 덧붙인다. CREATE TABLE IF NOT EXISTS 로는 추가되지 않는다. */
function addColumn(table: string, column: string, definition: string): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  if (columns.some((c) => c.name === column)) return
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
}

addColumn('settings', 'goal_ms', 'INTEGER')
addColumn('settings', 'interval_ms', 'INTEGER')
addColumn('settings', 'sound_enabled', 'INTEGER NOT NULL DEFAULT 1')

// 설정은 항상 한 행만 존재한다.
db.prepare('INSERT OR IGNORE INTO settings (id) VALUES (1)').run()
