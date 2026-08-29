import { useEffect, useState } from 'react'

/**
 * 현재 배경 이미지를 불러온다. 캔버스는 매 프레임 그리므로 미리 받아 둬야 한다.
 * 못 불러오면 null 을 유지한다 — 배경이 없다고 스톱워치가 멈추지는 않는다. (PRD 4.4)
 */
export function useBackground(backgroundId: number | null): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    if (backgroundId === null) {
      setImage(null)
      return
    }

    let cancelled = false
    const loading = new Image()
    loading.onload = () => {
      if (!cancelled) setImage(loading)
    }
    loading.onerror = () => {
      if (!cancelled) setImage(null)
    }
    loading.src = `/api/backgrounds/${backgroundId}`

    return () => {
      cancelled = true
    }
  }, [backgroundId])

  return image
}
