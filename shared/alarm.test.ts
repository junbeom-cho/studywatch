import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { messageFor, nextAlarm } from './alarm'

const MIN = 60_000

describe('다음 알림 계산', () => {
  it('둘 다 꺼져 있으면 울릴 것이 없다', () => {
    assert.equal(nextAlarm(0, null, null), null)
  })

  it('목표는 그 시각에 한 번 울린다', () => {
    assert.deepEqual(nextAlarm(0, 120 * MIN, null), { kind: 'goal', at: 120 * MIN })
  })

  it('목표를 이미 지났으면 다시 울리지 않는다', () => {
    assert.equal(nextAlarm(121 * MIN, 120 * MIN, null), null)
  })

  it('목표 시각 정각에는 이미 울린 것으로 본다', () => {
    assert.equal(nextAlarm(120 * MIN, 120 * MIN, null), null)
  })

  it('반복은 다음 배수에서 울린다', () => {
    assert.deepEqual(nextAlarm(0, null, 25 * MIN), { kind: 'interval', at: 25 * MIN })
    assert.deepEqual(nextAlarm(30 * MIN, null, 25 * MIN), { kind: 'interval', at: 50 * MIN })
  })

  it('반복 정각에는 그 다음 배수로 넘어간다 — 같은 알림이 두 번 울리지 않는다', () => {
    assert.deepEqual(nextAlarm(25 * MIN, null, 25 * MIN), { kind: 'interval', at: 50 * MIN })
  })

  it('새로고침해서 중간부터 시작해도 지나온 반복은 울리지 않는다', () => {
    assert.deepEqual(nextAlarm(88 * MIN, null, 25 * MIN), { kind: 'interval', at: 100 * MIN })
  })

  it('둘 다 켜져 있으면 더 가까운 쪽이 먼저다', () => {
    assert.deepEqual(nextAlarm(0, 120 * MIN, 25 * MIN), { kind: 'interval', at: 25 * MIN })
    assert.deepEqual(nextAlarm(110 * MIN, 120 * MIN, 25 * MIN), { kind: 'goal', at: 120 * MIN })
  })

  it('목표가 지난 뒤에도 반복은 계속된다', () => {
    assert.deepEqual(nextAlarm(130 * MIN, 120 * MIN, 25 * MIN), { kind: 'interval', at: 150 * MIN })
  })

  it('0 이나 음수는 꺼진 것으로 본다', () => {
    assert.equal(nextAlarm(0, 0, 0), null)
    assert.equal(nextAlarm(0, -1, -1), null)
  })
})

describe('알림 문구', () => {
  it('한 시간 미만은 분으로만 적는다', () => {
    assert.equal(messageFor('interval', 25 * MIN), '25분 경과')
    assert.equal(messageFor('goal', 50 * MIN), '목표 50분 달성')
  })

  it('한 시간이 넘으면 시간과 분으로 나눈다', () => {
    assert.equal(messageFor('goal', 90 * MIN), '목표 1시간 30분 달성')
    assert.equal(messageFor('interval', 125 * MIN), '2시간 5분 경과')
  })

  it('정각이면 분을 붙이지 않는다', () => {
    assert.equal(messageFor('goal', 120 * MIN), '목표 2시간 달성')
  })
})
