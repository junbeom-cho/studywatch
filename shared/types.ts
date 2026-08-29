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

export type Theme = 'dark' | 'light'

export interface Settings {
  nickname: string
  courseName: string
  instructorName: string
  /** 목표 시간. null 이면 목표 알림이 꺼진 상태다. 기본값을 지어내지 않는다. (PRD 4.5) */
  goalMs: number | null
  /** 반복 알림 간격. null 이면 반복 알림이 꺼진 상태다. */
  intervalMs: number | null
  soundEnabled: boolean
  /** 배경으로 쓸 이미지. null 이면 기본 배경. */
  backgroundId: number | null
  theme: Theme
}

export interface ScreenshotMeta {
  id: number
  takenAt: number
  byteSize: number
}

export interface BackgroundMeta {
  id: number
  uploadedAt: number
  byteSize: number
}

/** 지난 기록 하나. 기록 화면에서 지울 수 있게 id 를 함께 준다. */
export interface SessionRecord {
  id: number
  startedAt: number
  stoppedAt: number | null
  elapsedMs: number
  /** 아직 돌고 있는 세션이면 지울 수 없다 — 버리기를 써야 한다 */
  live: boolean
}

export interface CalendarData {
  /** 오늘의 학습일. 자정이 아니라 세션 시작일 기준이므로 서버가 정해서 내려준다. */
  today: string
  from: string
  to: string
  /** 기록이 있는 날만 담긴다. 없는 날은 0 으로 본다. */
  totals: Record<string, number>
}

export interface AppState {
  /** 응답을 만든 시각. 클라이언트는 이걸로 자기 시계와의 오차를 보정한다. */
  serverNow: number
  session: SessionSnapshot | null
  settings: Settings
}
