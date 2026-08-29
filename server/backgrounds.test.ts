import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'

// db.ts 가 불러올 때 DATA_DIR 을 읽으므로 import 보다 먼저 정해야 한다
const dir = mkdtempSync(join(tmpdir(), 'studywatch-bg-'))
process.env.DATA_DIR = dir

const { backgroundFile, listBackgrounds, removeBackground, saveBackground } =
  await import('./backgrounds')
const { readSettings, writeSettings } = await import('./store')
const { db } = await import('./db')

const PNG = Buffer.from('89504e470d0a1a0a', 'hex')
const files = () => readdirSync(join(dir, 'backgrounds'))

describe('배경 보관', () => {
  after(() => {
    db.close()
    rmSync(dir, { recursive: true, force: true })
  })

  it('저장하면 목록에 뜨고 파일이 생긴다', () => {
    const meta = saveBackground(PNG, 'image/png', Date.now())
    assert.equal(meta.byteSize, PNG.byteLength)
    assert.equal(listBackgrounds().length, 1)
    assert.ok(backgroundFile(meta.id), '파일 경로를 돌려줘야 한다')
  })

  it('형식에 맞는 확장자를 붙인다', () => {
    const jpeg = saveBackground(PNG, 'image/jpeg', Date.now() + 1)
    const found = backgroundFile(jpeg.id)
    assert.ok(found?.path.endsWith('.jpg'), `확장자가 jpg 여야 한다: ${found?.path}`)
    assert.equal(found?.mime, 'image/jpeg')
  })

  it('지우면 행과 파일이 함께 사라진다', () => {
    const meta = saveBackground(PNG, 'image/png', Date.now() + 2)
    const path = backgroundFile(meta.id)?.path
    assert.ok(path && existsSync(path))

    assert.equal(removeBackground(meta.id), true)
    assert.equal(backgroundFile(meta.id), null)
    assert.equal(existsSync(path), false, '파일도 지워져야 한다')
  })

  it('쓰고 있던 배경을 지우면 설정이 비워진다', () => {
    // 없는 배경을 가리키고 있으면 화면이 배경 없이 뜨는 것보다 나쁘다
    const meta = saveBackground(PNG, 'image/png', Date.now() + 3)
    writeSettings({ backgroundId: meta.id })
    assert.equal(readSettings().backgroundId, meta.id)

    removeBackground(meta.id)
    assert.equal(readSettings().backgroundId, null)
  })

  it('다른 배경을 지워도 쓰고 있는 설정은 그대로다', () => {
    const keep = saveBackground(PNG, 'image/png', Date.now() + 4)
    const other = saveBackground(PNG, 'image/png', Date.now() + 5)
    writeSettings({ backgroundId: keep.id })

    removeBackground(other.id)
    assert.equal(readSettings().backgroundId, keep.id)
  })

  it('같은 밀리초에 두 번 올려도 서로 다른 파일이 된다', () => {
    const at = Date.now()
    const first = saveBackground(PNG, 'image/png', at)
    const second = saveBackground(PNG, 'image/png', at)

    assert.notEqual(first.id, second.id)
    assert.notEqual(backgroundFile(first.id)?.path, backgroundFile(second.id)?.path)
    assert.ok(backgroundFile(first.id), '먼저 올린 것이 살아 있어야 한다')
  })

  it('없는 id 는 지워지지 않는다', () => {
    const before = files().length
    assert.equal(removeBackground(999_999), false)
    assert.equal(backgroundFile(999_999), null)
    assert.equal(files().length, before, '엉뚱한 파일을 건드리면 안 된다')
  })
})
