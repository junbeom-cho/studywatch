/**
 * 표시면 캔버스를 PNG 로 만들어 두 곳에 보낸다 — 클립보드 · 서버.
 * 하나가 실패해도 나머지는 진행한다. 파일로 받고 싶으면 달력에서 골라 내려받는다. (PRD 4.2)
 */

import { FACE_HEIGHT, FACE_WIDTH } from './face'

export interface CaptureOutcome {
  done: string[]
  failed: string[]
}

const TARGETS = ['클립보드 복사', '서버 보관'] as const

/**
 * 표시용 캔버스는 화면 밀도만큼 크다. 폰(dpr 3)에서는 3600x2025 이 되어 장당 몇 MB 씩
 * 쌓인다. 내보낼 때는 기기와 무관하게 고정 크기로 줄여 파일 크기를 예측 가능하게 둔다.
 */
function atFaceSize(source: HTMLCanvasElement): HTMLCanvasElement {
  if (source.width === FACE_WIDTH && source.height === FACE_HEIGHT) return source

  const target = document.createElement('canvas')
  target.width = FACE_WIDTH
  target.height = FACE_HEIGHT

  const ctx = target.getContext('2d')
  if (!ctx) return source // 줄이지 못하면 원본 그대로 내보낸다. 크기가 클 뿐 내용은 같다.
  ctx.drawImage(source, 0, 0, FACE_WIDTH, FACE_HEIGHT)
  return target
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('캔버스를 이미지로 바꾸지 못했다'))),
      'image/png',
    )
  })
}

function writeToClipboard(blob: Promise<Blob>): Promise<void> {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
    // http 로 접속하면 여기로 온다. Clipboard API 는 secure context 를 요구한다.
    return Promise.reject(new Error('이 접속에서는 쓸 수 없다'))
  }
  return navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
}

async function upload(blob: Blob): Promise<void> {
  const response = await fetch('/api/screenshots', {
    method: 'POST',
    headers: { 'content-type': 'image/png' },
    body: blob,
  })
  if (!response.ok) throw new Error(`서버가 ${response.status} 을 돌려줬다`)
}

function reason(error: unknown): string {
  if (error instanceof DOMException && error.name === 'NotAllowedError') return '권한 거부'
  return error instanceof Error ? error.message : '알 수 없는 이유'
}

export async function captureFace(canvas: HTMLCanvasElement): Promise<CaptureOutcome> {
  const pending = toBlob(atFaceSize(canvas))

  // 클립보드 쓰기는 사용자 제스처가 살아 있는 동안 시작해야 한다. await 뒤로 미루면 거부된다.
  // 여기서 바로 catch 를 붙여 두지 않으면 처리되지 않은 rejection 이 된다.
  const clipboard = writeToClipboard(pending).then(
    () => null,
    (error: unknown) => error,
  )

  let blob: Blob
  try {
    blob = await pending
  } catch (error) {
    void clipboard
    return { done: [], failed: [`화면을 이미지로 만들지 못했다 (${reason(error)})`] }
  }

  const results = await Promise.all(
    [
      clipboard.then((error) => {
        if (error) throw error
      }),
      upload(blob),
    ].map((task) =>
      task.then(
        () => null,
        (error: unknown) => error,
      ),
    ),
  )

  const done: string[] = []
  const failed: string[] = []
  results.forEach((error, index) => {
    const target = TARGETS[index] ?? '알 수 없는 대상'
    if (error) failed.push(`${target} (${reason(error)})`)
    else done.push(target)
  })

  return { done, failed }
}
