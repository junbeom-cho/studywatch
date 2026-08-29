import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'
import { Calendar } from './Calendar'
import { DiscardButton } from './DiscardButton'
import { SettingsPanel } from './SettingsPanel'
import { WatchCanvas } from './WatchCanvas'
import { captureFace } from './screenshot'
import { useAlarms } from './useAlarms'
import { useAppState } from './useAppState'

const NOTICE_MS = 6000

export default function App() {
  const { state, connection, serverNow, run } = useAppState()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useAlarms(state, serverNow)
  const [notice, setNotice] = useState<string | null>(null)
  const [capturing, setCapturing] = useState(false)

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), NOTICE_MS)
    return () => clearTimeout(timer)
  }, [notice])

  const capture = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    setCapturing(true)
    const { done, failed } = await captureFace(canvas)
    setCapturing(false)

    const parts: string[] = []
    if (done.length > 0) parts.push(`${done.join(' · ')} 완료`)
    if (failed.length > 0) parts.push(`실패 — ${failed.join(', ')}`)
    setNotice(parts.join('   /   '))
  }, [])

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
      <WatchCanvas state={state} serverNow={serverNow} canvasRef={canvasRef} />

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

      <div className="controls">
        <button className="btn" disabled={capturing} onClick={() => void capture()}>
          {capturing ? '찍는 중…' : '스크린샷'}
        </button>
      </div>

      {notice && <p className="notice notice--small">{notice}</p>}

      <Calendar sessionKey={session ? String(session.id) : 'idle'} />

      <SettingsPanel
        settings={state.settings}
        onSave={(patch) => void run(() => api.saveSettings(patch))}
      />
    </main>
  )
}
