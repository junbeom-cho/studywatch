import { api } from './api'
import { DiscardButton } from './DiscardButton'
import { SettingsPanel } from './SettingsPanel'
import { WatchCanvas } from './WatchCanvas'
import { useAppState } from './useAppState'

export default function App() {
  const { state, connection, serverNow, run } = useAppState()

  if (!state) {
    return (
      <main className="app">
        <p className="notice">
          {connection === 'offline' ? '서버에 연결하지 못했다.' : '불러오는 중…'}
        </p>
      </main>
    )
  }

  const session = state.session
  const offline = connection === 'offline'

  return (
    <main className="app">
      <WatchCanvas state={state} serverNow={serverNow} />

      {offline && (
        <p className="notice notice--warn">연결 끊김 — 지금 흐르는 시간은 기록되지 않는다.</p>
      )}

      <div className="controls">
        {!session && (
          <button
            className="btn btn--primary"
            disabled={offline}
            onClick={() => void run(api.start)}
          >
            시작
          </button>
        )}
        {session?.state === 'running' && (
          <button className="btn" disabled={offline} onClick={() => void run(api.pause)}>
            일시정지
          </button>
        )}
        {session?.state === 'paused' && (
          <button
            className="btn btn--primary"
            disabled={offline}
            onClick={() => void run(api.resume)}
          >
            재개
          </button>
        )}
        {session && (
          <button className="btn btn--ghost" disabled={offline} onClick={() => void run(api.stop)}>
            정지
          </button>
        )}
        {session && <DiscardButton disabled={offline} onConfirm={() => void run(api.discard)} />}
      </div>

      <SettingsPanel
        settings={state.settings}
        onSave={(patch) => void run(() => api.saveSettings(patch))}
      />
    </main>
  )
}
