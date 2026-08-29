import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { monthGrid, monthOf, shiftMonth } from './month'

describe('월 격자', () => {
  it('항상 6주 x 7일이다', () => {
    // 주 수가 달마다 바뀌면 화면 높이가 들썩인다
    for (const month of [1, 2, 5, 9, 12]) {
      const grid = monthGrid(2026, month)
      assert.equal(grid.weeks.length, 6, `${month}월`)
      for (const week of grid.weeks) assert.equal(week.length, 7)
    }
  })

  it('1일이 그 달의 요일 자리에 놓인다', () => {
    // 2026-09-01 은 화요일이라 첫 주의 세 번째 칸이다
    const [first] = monthGrid(2026, 9).weeks
    assert.deepEqual(first, [
      null,
      null,
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
      '2026-09-05',
    ])
  })

  it('그 달의 날짜만 담는다', () => {
    const days = monthGrid(2026, 9)
      .weeks.flat()
      .filter((day) => day !== null)
    assert.equal(days.length, 30)
    assert.equal(days[0], '2026-09-01')
    assert.equal(days[29], '2026-09-30')
  })

  it('윤년 2월은 29일까지다', () => {
    const days = monthGrid(2028, 2)
      .weeks.flat()
      .filter((day) => day !== null)
    assert.equal(days.length, 29)
  })

  it('평년 2월은 28일까지다', () => {
    const days = monthGrid(2026, 2)
      .weeks.flat()
      .filter((day) => day !== null)
    assert.equal(days.length, 28)
  })

  it('달을 옮기면 해가 넘어간다', () => {
    assert.deepEqual(shiftMonth(2026, 1, -1), { year: 2025, month: 12 })
    assert.deepEqual(shiftMonth(2026, 12, 1), { year: 2027, month: 1 })
    assert.deepEqual(shiftMonth(2026, 9, 0), { year: 2026, month: 9 })
  })

  it('날짜에서 연월을 읽는다', () => {
    assert.deepEqual(monthOf('2026-09-15'), { year: 2026, month: 9 })
  })

  it('라벨은 한국어로 적는다', () => {
    assert.equal(monthGrid(2026, 9).label, '2026년 9월')
  })
})
