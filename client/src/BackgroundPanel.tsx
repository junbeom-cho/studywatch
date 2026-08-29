import { useCallback, useEffect, useRef, useState } from 'react'
import type { BackgroundMeta } from '../../shared/types'

interface Props {
  currentId: number | null
  onPick: (id: number | null) => void
  /** 배경을 지우면 설정도 함께 바뀌므로 서버 상태를 다시 읽는다 */
  onRefresh: () => void
}

const ACCEPT = 'image/png,image/jpeg,image/webp'

export function BackgroundPanel({ currentId, onPick, onRefresh }: Props) {
  const [items, setItems] = useState<BackgroundMeta[]>([])
  const [problem, setProblem] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/backgrounds')
      if (response.ok) setItems((await response.json()) as BackgroundMeta[])
    } catch {
      // 목록을 못 읽어도 지금 배경은 그대로 보인다
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const upload = async (file: File) => {
    setBusy(true)
    setProblem(null)
    try {
      const response = await fetch('/api/backgrounds', {
        method: 'POST',
        headers: { 'content-type': file.type },
        body: file,
      })
      const payload = (await response.json()) as BackgroundMeta | { error: string }

      if (!response.ok) {
        setProblem('error' in payload ? payload.error : `업로드 실패 (${response.status})`)
        return
      }
      await load()
      onPick((payload as BackgroundMeta).id)
    } catch {
      setProblem('업로드하지 못했다')
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const remove = async (id: number) => {
    setBusy(true)
    try {
      await fetch(`/api/backgrounds/${id}`, { method: 'DELETE' })
      await load()
      onRefresh()
    } catch {
      setProblem('지우지 못했다')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="backgrounds">
      <div className="backgrounds__head">
        <span className="field__label">배경</span>
        <label className={`btn btn--file${busy ? ' btn--busy' : ''}`}>
          {busy ? '올리는 중…' : '이미지 추가'}
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPT}
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void upload(file)
            }}
          />
        </label>
      </div>

      <div className="backgrounds__list">
        <button
          type="button"
          className={`thumb thumb--none${currentId === null ? ' thumb--on' : ''}`}
          onClick={() => onPick(null)}
          title="배경 없음"
        >
          없음
        </button>

        {items.map((item) => (
          <div key={item.id} className={`thumb${currentId === item.id ? ' thumb--on' : ''}`}>
            <button
              type="button"
              className="thumb__pick"
              onClick={() => onPick(item.id)}
              title="이 배경 쓰기"
            >
              <img src={`/api/backgrounds/${item.id}`} alt="" />
            </button>
            <button
              type="button"
              className="thumb__remove"
              disabled={busy}
              onClick={() => void remove(item.id)}
              title="지우기"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {problem && <p className="notice notice--small">{problem}</p>}
    </section>
  )
}
