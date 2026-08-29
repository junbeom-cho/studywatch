import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { levelOf, streakOf, weeksOf } from './calendarGrid'

const MIN = 60_000

describe('잔디 색 단계', () => {
  it('기록이 없으면 0 단계다', () => {
    assert.equal(levelOf(0), 0)
    assert.equal(levelOf(-1), 0)
  })

  it('30분 미만은 1 단계다', () => {
    assert.equal(levelOf(1), 1)
    assert.equal(levelOf(29 * MIN), 1)
  })

  it('경계값은 위 단계로 올라간다', () => {
    assert.equal(levelOf(30 * MIN), 2)
    assert.equal(levelOf(60 * MIN), 3)
    assert.equal(levelOf(120 * MIN), 4)
  })

  it('아무리 오래 해도 4 단계가 최대다', () => {
    assert.equal(levelOf(10 * 60 * MIN), 4)
  })
})

describe('잔디 격자', () => {
  it('한 열이 7칸(한 주)이다', () => {
    const weeks = weeksOf('2026-08-01', '2026-08-31', {})
    for (const week of weeks) assert.equal(week.length, 7)
  })

  it('첫 주는 시작 요일 앞을 비운다', () => {
    // 2026-08-01 은 토요일이라 앞 6칸이 비어야 한다
    const [first] = weeksOf('2026-08-01', '2026-08-07', {})
    assert.deepEqual(
      first?.map((cell) => cell?.date ?? null),
      [null, null, null, null, null, null, '2026-08-01'],
    )
  })

  it('기록이 있는 날에 값과 단계가 붙는다', () => {
    const weeks = weeksOf('2026-08-01', '2026-08-03', { '2026-08-02': 90 * MIN })
    const cells = weeks.flat().filter((cell) => cell !== null)
    const target = cells.find((cell) => cell.date === '2026-08-02')
    assert.equal(target?.totalMs, 90 * MIN)
    assert.equal(target?.level, 3)
    assert.equal(cells.find((cell) => cell.date === '2026-08-01')?.level, 0)
  })

  it('달을 넘겨도 이어진다', () => {
    const cells = weeksOf('2026-08-30', '2026-09-02', {})
      .flat()
      .filter((cell) => cell !== null)
      .map((cell) => cell.date)
    assert.deepEqual(cells, ['2026-08-30', '2026-08-31', '2026-09-01', '2026-09-02'])
  })
})

describe('연속 일수', () => {
  const totals = {
    '2026-08-28': 10 * MIN,
    '2026-08-29': 10 * MIN,
    '2026-08-30': 10 * MIN,
  }

  it('오늘까지 이어진 날을 센다', () => {
    assert.equal(streakOf('2026-08-30', totals), 3)
  })

  it('오늘 아직 시작 전이면 어제까지의 연속을 보여준다', () => {
    // 하루가 끝나기도 전에 0 이 되면 맥이 빠진다
    assert.equal(streakOf('2026-08-31', totals), 3)
  })

  it('이틀 이상 비면 끊긴다', () => {
    assert.equal(streakOf('2026-09-01', totals), 0)
  })

  it('중간에 빈 날이 있으면 거기서 멈춘다', () => {
    const gapped = { ...totals, '2026-08-29': 0 }
    assert.equal(streakOf('2026-08-30', gapped), 1)
  })

  it('기록이 아예 없으면 0 이다', () => {
    assert.equal(streakOf('2026-08-30', {}), 0)
  })
})
