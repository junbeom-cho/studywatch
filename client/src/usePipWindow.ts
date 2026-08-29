import { useCallback, useEffect, useState } from 'react'

const PIP_WIDTH = 440
const PIP_HEIGHT = 330

export function pipSupported(): boolean {
  return typeof window !== 'undefined' && 'documentPictureInPicture' in window
}

/** 스타일시트는 새 창으로 따라가지 않는다. 통째로 복제해 넣는다. */
function copyStyles(target: Window): void {
  const sources = document.querySelectorAll<HTMLElement>('style, link[rel="stylesheet"]')
  for (const source of sources) target.document.head.appendChild(source.cloneNode(true))
}

/**
 * PIP 창을 열고 닫는다. 창을 사용자가 직접 닫아도 상태가 따라오도록 pagehide 를 듣는다.
 */
export function usePipWindow() {
  const [pip, setPip] = useState<Window | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  const close = useCallback(() => {
    pip?.close()
    setPip(null)
    setProblem(null)
  }, [pip])

  const open = useCallback(async () => {
    const api = window.documentPictureInPicture
    if (!api) return

    setProblem(null)
    try {
      const opened = await api.requestWindow({ width: PIP_WIDTH, height: PIP_HEIGHT })
      copyStyles(opened)
      opened.document.body.classList.add('pip-body')
      opened.addEventListener('pagehide', () => setPip(null))
      setPip(opened)
    } catch (error) {
      // 조용히 삼키면 버튼을 눌러도 아무 일도 안 일어나는 것처럼 보인다. 이유를 알린다.
      const reason = error instanceof Error ? error.message : '알 수 없는 이유'
      setProblem(`PIP 창을 열지 못했다 — ${reason}`)
    }
  }, [])

  // 탭이 닫히면 PIP 창도 함께 닫는다. 떠 있는 채로 남으면 곤란하다.
  useEffect(() => {
    if (!pip) return
    const shut = () => pip.close()
    window.addEventListener('pagehide', shut)
    return () => window.removeEventListener('pagehide', shut)
  }, [pip])

  return { pip, problem, open, close }
}
