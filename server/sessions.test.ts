import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, beforeEach, describe, it } from 'node:test'

// db.ts 가 불러올 때 DATA_DIR 을 읽으므로 import 보다 먼저 정해야 한다
const dir = mkdtempSync(join(tmpdir(), 'studywatch-rec-'))
process.env.DATA_DIR = dir

const { rebuildDaily, removeSession, sessionsOn, startSession, stopSession } =
  await import('./store')
const { db } = await import('./db')
const { studyDateOf } = await import('../shared/time')

const HOUR = 3_600_000
const clear = () => {
  db.prepare('DELETE FROM session').run()
  db.prepare('DELETE FROM daily_study').run()
}

/** 끝난 기록 하나를 원하는 시각에 심는다 */
function seed(startedAt: number, lengthMs: number): number {
  const info = db
    .prepare("INSERT INTO session (started_at, stopped_at, state) VALUES (?, ?, 'finished')")
    .run(startedAt, startedAt + lengthMs)
  return Number(info.lastInsertRowid)
}

const totalOn = (date: string): number =>
  (
    db.prepare('SELECT total_ms FROM daily_study WHERE study_date = ?').get(date) as
      { total_ms: number } | undefined
  )?.total_ms ?? 0

describe('기록 목록과 삭제', () => {
  const noon = new Date(2026, 7, 20, 12, 0).getTime()
  const date = studyDateOf(noon)

  beforeEach(clear)
  after(() => {
    db.close()
    rmSync(dir, { recursive: true, force: true })
  })

  it('그 날 기록만 돌려준다', () => {
    seed(noon, HOUR)
    seed(noon + 3 * HOUR, HOUR)
    seed(noon + 5 * 24 * HOUR, HOUR) // 다른 날

    const records = sessionsOn(date, Date.now())
    assert.equal(records.length, 2)
    for (const record of records) assert.equal(studyDateOf(record.startedAt), date)
  })

  it('최근 것이 앞에 온다', () => {
    const older = seed(noon, HOUR)
    const newer = seed(noon + 3 * HOUR, HOUR)
    const records = sessionsOn(date, Date.now())
    assert.equal(records[0]?.id, newer)
    assert.equal(records[1]?.id, older)
  })

  it('돌고 있는 기록은 live 로 표시된다', () => {
    const now = Date.now()
    startSession(now)
    const live = sessionsOn(studyDateOf(now), now).find((record) => record.live)
    assert.ok(live, 'live 기록이 있어야 한다')
    assert.equal(live.stoppedAt, null)
    stopSession(now + 1000)
  })

  it('돌고 있는 기록은 지워지지 않는다', () => {
    // 그건 버리기가 할 일이다. 여기서 지워지면 두 버튼이 같은 일을 하게 된다.
    const now = Date.now()
    startSession(now)
    const live = sessionsOn(studyDateOf(now), now).find((record) => record.live)
    assert.equal(removeSession(live?.id ?? -1, now), 'live')
    stopSession(now + 1000)
  })

  it('없는 기록은 gone 이다', () => {
    assert.equal(removeSession(999_999, Date.now()), 'gone')
  })

  it('지우면 그 날 집계가 그만큼 줄어든다', () => {
    const keep = seed(noon, HOUR)
    const drop = seed(noon + 3 * HOUR, 2 * HOUR)
    rebuildDaily(Date.now())
    assert.equal(totalOn(date), 3 * HOUR)

    assert.equal(removeSession(drop, Date.now()), 'removed')
    assert.equal(totalOn(date), HOUR, '남은 기록만큼만 남아야 한다')
    assert.equal(sessionsOn(date, Date.now()).length, 1)
    assert.equal(sessionsOn(date, Date.now())[0]?.id, keep)
  })

  it('집계를 원본에서 통째로 다시 만든다', () => {
    // 집계 테이블이 비어 있어도 세션만 있으면 복구돼야 한다 (PRD 5.2)
    seed(noon, HOUR)
    seed(noon + 3 * HOUR, HOUR)
    db.prepare('DELETE FROM daily_study').run()
    assert.equal(totalOn(date), 0)

    rebuildDaily(Date.now())
    assert.equal(totalOn(date), 2 * HOUR)
  })

  it('세션이 모두 사라진 날은 집계도 0 이 된다', () => {
    const only = seed(noon, HOUR)
    rebuildDaily(Date.now())
    assert.equal(totalOn(date), HOUR)

    db.prepare('DELETE FROM session WHERE id = ?').run(only)
    rebuildDaily(Date.now())
    assert.equal(totalOn(date), 0, '남은 집계가 유령처럼 떠 있으면 안 된다')
  })
})
