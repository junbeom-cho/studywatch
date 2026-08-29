/** Document Picture-in-Picture API. 아직 표준 타입에 없어 직접 적는다. (Chrome/Edge 전용) */
interface DocumentPictureInPictureOptions {
  width?: number
  height?: number
  disallowReturnToOpener?: boolean
}

interface DocumentPictureInPicture extends EventTarget {
  requestWindow(options?: DocumentPictureInPictureOptions): Promise<Window>
  readonly window: Window | null
}

interface Window {
  readonly documentPictureInPicture?: DocumentPictureInPicture
}
