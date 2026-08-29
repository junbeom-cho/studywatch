/** 서버와 클라이언트가 함께 쓰는 타입. 시간은 모두 epoch 밀리초다. */

export type SessionState = 'running' | 'paused'

/** 일시정지 구간. resumedAt 이 null 이면 아직 멈춰 있는 중이다. */
export interface PauseSpan {
  pausedAt: number
  resumedAt: number | null
}

export interface SessionSnapshot {
  id: number
  state: SessionState
  startedAt: number
  pauses: PauseSpan[]
}

export interface Settings {
  nickname: string
  courseName: string
  instructorName: string
  /** 목표 시간. null 이면 목표 알림이 꺼진 상태다. 기본값을 지어내지 않는다. (PRD 4.5) */
  goalMs: number | null
  /** 반복 알림 간격. null 이면 반복 알림이 꺼진 상태다. */
  intervalMs: number | null
  soundEnabled: boolean
}

export interface ScreenshotMeta {
  id: number
  takenAt: number
  byteSize: number
}

export interface AppState {
  /** 응답을 만든 시각. 클라이언트는 이걸로 자기 시계와의 오차를 보정한다. */
  serverNow: number
  session: SessionSnapshot | null
  settings: Settings
}
