import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
// 폰트는 직접 싣는다. 이름만 부르면 안 깔린 기기에서 조용히 system-ui 로 떨어져
// 인증 스크린샷이 기기마다 다른 글자로 찍힌다.
import 'pretendard/dist/web/variable/pretendardvariable.css'
import '@fontsource-variable/jetbrains-mono/wght.css'
import './styles.css'

// Safari 는 캔버스에서만 쓰는 웹폰트를 스스로 받아오지 않는다. 시계 숫자는 DOM 어디에도
// 없으므로 폰에서 폴백으로 그려질 수 있다. 먼저 받아 둔다.
void document.fonts.load('700 152px "JetBrains Mono Variable"')

const root = document.getElementById('root')
if (!root) throw new Error('#root 를 찾지 못했다')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
