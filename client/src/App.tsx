import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { monthOf } from '../../shared/month'
import { api } from './api'
import { BackgroundPanel } from './BackgroundPanel'
import { Calendar } from './Calendar'
import { DiscardButton } from './DiscardButton'
import { Icon } from './Icon'
import { PipView } from './PipView'
import { SettingsPanel } from './SettingsPanel'
import { WatchCanvas } from './WatchCanvas'
import { streakOf } from './calendarGrid'
import { captureFace } from './screenshot'
import { useAlarms } from './useAlarms'
import { useAppState } from './useAppState'
import { useBackground } from './useBackground'
import { useCalendar } from './useCalendar'
import { pipSupported, usePipWindow } from './usePipWindow'

const NOTICE_MS = 6000

export default function App() {
  const { state, connection, serverNow, run } = useAppState()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [shotKey, setShotKey] = useState(0)

  useAlarms(state, serverNow)
  const background = useBackground(state?.settings.backgroundId ?? null)
  const { pip, problem: pipProblem, open: openPip, close: closePip } = usePipWindow()

  const sessionKey = state?.session ? String(state.session.id) : 'idle'
  const { calendar, reload: reloadCalendar } = useCalendar(sessionKey)

  /** 캔버스가 그릴 이번 달 정보. 연속 일수도 여기서 계산해 화면 안에 함께 그린다. */
  const faceCalendar = useMemo(() => {
    if (!calendar) return null
    const { year, month } = monthOf(calendar.today)
    return {
      year,
      month,
      today: calendar.today,
      totals: calendar.totals,
      streak: streakOf(calendar.today, calendar.totals),
    }
  }, [calendar])

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
    setShotKey((key) => key + 1)
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

  const stop = () => {
    void run(api.stop).then(reloadCalendar)
  }

  return (
    <main className="app">
      <WatchCanvas
        state={state}
        serverNow={serverNow}
        canvasRef={canvasRef}
        background={background}
        calendar={faceCalendar}
      />

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
            <Icon name="play" />
            시작
          </button>
        )}
        {session?.state === 'running' && (
          <button className="btn" disabled={offline} onClick={() => void run(api.pause)}>
            <Icon name="pause" />
            일시정지
          </button>
        )}
        {session?.state === 'paused' && (
          <button
            className="btn btn--primary"
            disabled={offline}
            onClick={() => void run(api.resume)}
          >
            <Icon name="play" />
            재개
          </button>
        )}
        {session && (
          <button className="btn btn--ghost" disabled={offline} onClick={stop}>
            <Icon name="stop" />
            정지
          </button>
        )}
        {session && (
          <DiscardButton
            disabled={offline}
            onConfirm={() => void run(api.discard).then(reloadCalendar)}
          />
        )}
      </div>

      <div className="controls">
        <button className="btn" disabled={capturing} onClick={() => void capture()}>
          <Icon name="camera" />
          {capturing ? '찍는 중…' : '스크린샷'}
        </button>
        {pipSupported() && (
          <button className="btn" onClick={() => (pip ? closePip() : void openPip())}>
            <Icon name="pip" />
            {pip ? 'PIP 닫기' : 'PIP'}
          </button>
        )}
      </div>

      {pip &&
        createPortal(
          <PipView
            state={state}
            serverNow={serverNow}
            background={background}
            calendar={faceCalendar}
            offline={offline}
            onStart={() => void run(api.start)}
            onPause={() => void run(api.pause)}
            onResume={() => void run(api.resume)}
            onStop={stop}
          />,
          pip.document.body,
        )}

      {pipProblem && <p className="notice notice--small">{pipProblem}</p>}
      {notice && <p className="notice notice--small">{notice}</p>}

      <Calendar calendar={calendar} shotKey={shotKey} />

      <BackgroundPanel
        currentId={state.settings.backgroundId}
        onPick={(backgroundId) => void run(() => api.saveSettings({ backgroundId }))}
        onRefresh={() => void run(api.state)}
      />

      <SettingsPanel
        settings={state.settings}
        onSave={(patch) => void run(() => api.saveSettings(patch))}
      />
    </main>
  )
}
