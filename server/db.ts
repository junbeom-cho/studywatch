import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const dataDir = process.env.DATA_DIR ?? resolve(process.cwd(), 'data')
mkdirSync(dataDir, { recursive: true })

export const db = new Database(resolve(dataDir, 'studywatch.db'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    id              INTEGER PRIMARY KEY CHECK (id = 1),
    nickname        TEXT NOT NULL DEFAULT '',
    course_name     TEXT NOT NULL DEFAULT '',
    instructor_name TEXT NOT NULL DEFAULT ''
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

  CREATE INDEX IF NOT EXISTS idx_pause_span_session ON pause_span (session_id);
  CREATE INDEX IF NOT EXISTS idx_session_state ON session (state);
`)

// 설정은 항상 한 행만 존재한다.
db.prepare('INSERT OR IGNORE INTO settings (id) VALUES (1)').run()
