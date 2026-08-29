import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  activeSpans,
  elapsedMs,
  formatDate,
  formatElapsed,
  studyDateOf,
  studyDatesBetween,
  studyDayRange,
} from './time'

const HOUR = 3_600_000
const at = (y: number, m: number, d: number, h: number, min = 0) =>
  new Date(y, m - 1, d, h, min).getTime()

describe('학습일 경계 (04:00)', () => {
  it('새벽 3시 59분은 전날로 친다', () => {
    assert.equal(studyDateOf(at(2026, 8, 30, 3, 59)), '2026-08-29')
  })

  it('새벽 4시부터 당일이다', () => {
    assert.equal(studyDateOf(at(2026, 8, 30, 4, 0)), '2026-08-30')
  })

  it('자정을 넘겨도 04시 전이면 아직 전날이다', () => {
    assert.equal(studyDateOf(at(2026, 8, 31, 0, 10)), '2026-08-30')
  })

  it('하루의 구간은 04:00 부터 다음날 04:00 까지다', () => {
    assert.deepEqual(studyDayRange('2026-08-30'), [at(2026, 8, 30, 4), at(2026, 8, 31, 4)])
  })

  it('23시에 시작해 새벽 1시에 끝나면 학습일 하나에만 걸린다', () => {
    assert.deepEqual(studyDatesBetween(at(2026, 8, 30, 23), at(2026, 8, 31, 1)), ['2026-08-30'])
  })

  it('23시에 시작해 새벽 5시에 끝나면 학습일 둘에 걸친다', () => {
    assert.deepEqual(studyDatesBetween(at(2026, 8, 30, 23), at(2026, 8, 31, 5)), [
      '2026-08-30',
      '2026-08-31',
    ])
  })
})

describe('경과 시간 계산', () => {
  const start = at(2026, 8, 30, 10, 0)

  it('일시정지한 만큼 빠진다', () => {
    const pauses = [{ pausedAt: start + HOUR, resumedAt: start + 2 * HOUR }]
    assert.equal(elapsedMs(start, pauses, start + 3 * HOUR), 2 * HOUR)
  })

  it('멈춰 있는 동안에는 늘지 않는다', () => {
    const pauses = [{ pausedAt: start + HOUR, resumedAt: null }]
    assert.equal(elapsedMs(start, pauses, start + 5 * HOUR), HOUR)
  })

  it('일시정지가 여러 번이어도 모두 빠진다', () => {
    const pauses = [
      { pausedAt: start + HOUR, resumedAt: start + 2 * HOUR },
      { pausedAt: start + 3 * HOUR, resumedAt: start + 4 * HOUR },
    ]
    assert.equal(elapsedMs(start, pauses, start + 5 * HOUR), 3 * HOUR)
  })

  it('일시정지 기록이 순서 없이 들어와도 결과가 같다', () => {
    const pauses = [
      { pausedAt: start + 3 * HOUR, resumedAt: start + 4 * HOUR },
      { pausedAt: start + HOUR, resumedAt: start + 2 * HOUR },
    ]
    assert.equal(elapsedMs(start, pauses, start + 5 * HOUR), 3 * HOUR)
  })

  it('시작 전 시각을 물으면 0이다', () => {
    assert.equal(elapsedMs(start, [], start - HOUR), 0)
  })

  it('흐른 구간을 그대로 돌려준다', () => {
    assert.deepEqual(activeSpans(start, [], start + HOUR), [[start, start + HOUR]])
  })
})

describe('표시 형식', () => {
  it('시:분:초와 밀리초를 나눠 돌려준다', () => {
    assert.deepEqual(formatElapsed(3 * HOUR + 25 * 60_000 + 7_089), {
      clock: '03:25:07',
      millis: '089',
    })
  })

  it('0은 00:00:00.000 이다', () => {
    assert.deepEqual(formatElapsed(0), { clock: '00:00:00', millis: '000' })
  })

  it('100시간이 넘어도 잘리지 않는다', () => {
    assert.deepEqual(formatElapsed(100 * HOUR), { clock: '100:00:00', millis: '000' })
  })

  it('날짜에 요일이 붙는다', () => {
    assert.equal(formatDate(at(2026, 8, 30, 12)), '2026년 8월 30일 (일)')
  })
})
