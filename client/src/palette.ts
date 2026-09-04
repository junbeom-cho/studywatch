import type { Theme } from '../../shared/types'

/**
 * 캔버스는 CSS 변수를 못 읽으므로 테마별 색을 여기에 따로 둔다.
 * styles.css 의 토큰과 짝이 맞아야 화면과 스크린샷이 같아 보인다.
 */
export interface Palette {
  bg: string
  text: string
  dim: string
  accent: string
  muted: string
  /** 배경 이미지 위에 덮는 막. 글자가 읽히게 하는 것이 목적이다. */
  scrim: string
  /** 배경 이미지가 없을 때 은은하게 까는 빛 */
  glow: string
  /** 글자 그림자 (배경 이미지가 있을 때만 쓴다) */
  shadow: string
  /** 화면을 나누는 얇은 선 */
  line: string
  /** 목표 진행 막대의 빈 부분 */
  track: string
  /** 잔디 0~4 단계 칸 색 */
  levelFill: readonly string[]
  /** 각 단계 칸 위의 날짜 글자 색 */
  levelText: readonly string[]
}

const DARK: Palette = {
  bg: '#0b0d12',
  text: '#e8ecf4',
  dim: '#8b94a7',
  accent: '#00c471',
  muted: '#5d6478',
  scrim: 'rgba(6, 8, 14, 0.55)',
  glow: 'rgba(0, 196, 113, 0.18)',
  shadow: 'rgba(0, 0, 0, 0.85)',
  line: 'rgba(232, 236, 244, 0.14)',
  track: 'rgba(232, 236, 244, 0.10)',
  // 어두운 바탕에서는 진한 초록부터 시작해 밝아진다
  levelFill: ['rgba(255, 255, 255, 0.07)', '#006c3e', '#00894f', '#00a760', '#00c471'],
  levelText: ['#5d6478', '#e8ecf4', '#e8ecf4', '#05130c', '#05130c'],
}

const LIGHT: Palette = {
  bg: '#ffffff',
  text: '#212529',
  dim: '#868e96',
  accent: '#00a760',
  muted: '#adb5bd',
  // 밝은 테마에서는 사진을 밝게 덮어야 어두운 글자가 읽힌다
  scrim: 'rgba(255, 255, 255, 0.66)',
  glow: 'rgba(0, 196, 113, 0.16)',
  shadow: 'rgba(255, 255, 255, 0.9)',
  line: 'rgba(33, 37, 41, 0.14)',
  track: 'rgba(33, 37, 41, 0.09)',
  // 밝은 바탕에서는 연한 초록부터 시작해 진해진다
  levelFill: ['#e9ecef', '#bff0db', '#73dfb1', '#26cd86', '#00a760'],
  levelText: ['#adb5bd', '#0b4a30', '#08331f', '#05130c', '#ffffff'],
}

export const PALETTES: Record<Theme, Palette> = { dark: DARK, light: LIGHT }

export const paletteOf = (theme: Theme): Palette => PALETTES[theme]
