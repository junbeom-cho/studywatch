import assert from 'node:assert/strict'
import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, describe, it } from 'node:test'

// db.ts 가 불러올 때 DATA_DIR 을 읽으므로 import 보다 먼저 정해야 한다
const dir = mkdtempSync(join(tmpdir(), 'studywatch-test-'))
process.env.DATA_DIR = dir

const { SCREENSHOT_LIMIT, listScreenshots, saveScreenshot, screenshotFile } =
  await import('./screenshots')
const { db } = await import('./db')

const PNG = Buffer.from('89504e470d0a1a0a', 'hex') // 내용은 보지 않으므로 머리만 있으면 된다

describe('스크린샷 보관', () => {
  before(() => {
    db.prepare('DELETE FROM screenshot').run()
  })

  after(() => {
    db.close()
    rmSync(dir, { recursive: true, force: true })
  })

  it('저장하면 목록에 뜨고 파일이 생긴다', () => {
    const meta = saveScreenshot(PNG, Date.now())
    assert.equal(meta.byteSize, PNG.byteLength)
    assert.ok(screenshotFile(meta.id), '파일 경로를 돌려줘야 한다')
    assert.equal(listScreenshots().length, 1)
  })

  it('최신이 앞에 온다', () => {
    const older = listScreenshots()[0]
    const newer = saveScreenshot(PNG, Date.now())
    assert.equal(listScreenshots()[0]?.id, newer.id)
    assert.notEqual(older?.id, newer.id)
  })

  it('상한을 넘으면 오래된 것부터 행과 파일이 함께 사라진다', () => {
    for (let i = 0; i < SCREENSHOT_LIMIT + 5; i += 1) saveScreenshot(PNG, Date.now() + i)

    const rows = listScreenshots()
    const files = readdirSync(join(dir, 'screenshots'))

    assert.equal(rows.length, SCREENSHOT_LIMIT, '행이 상한만큼만 남아야 한다')
    assert.equal(files.length, SCREENSHOT_LIMIT, '파일도 같이 지워져야 한다')
    // 남은 행이 모두 실제 파일을 가리켜야 한다 — 목록에만 있고 파일이 없는 상태가 없어야 한다
    for (const row of rows) assert.ok(screenshotFile(row.id), `${row.id} 의 파일이 없다`)
  })

  it('없는 id 는 null 이다', () => {
    assert.equal(screenshotFile(999_999), null)
  })
})
