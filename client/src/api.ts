import type { AppState, Settings } from '../../shared/types'

async function request(path: string, init?: RequestInit): Promise<AppState> {
  const response = await fetch(path, {
    headers: { 'content-type': 'application/json' },
    ...init,
  })
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`)
  return (await response.json()) as AppState
}

const post = (path: string) => request(path, { method: 'POST' })

/** 모든 호출이 갱신된 전체 상태를 돌려준다. 클라이언트가 따로 상태를 짜맞출 일이 없다. */
export const api = {
  state: () => request('/api/state'),
  start: () => post('/api/session/start'),
  pause: () => post('/api/session/pause'),
  resume: () => post('/api/session/resume'),
  stop: () => post('/api/session/stop'),
  saveSettings: (patch: Partial<Settings>) =>
    request('/api/settings', { method: 'PUT', body: JSON.stringify(patch) }),
}
