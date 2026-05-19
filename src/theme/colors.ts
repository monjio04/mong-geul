/**
 * 피그마 디자인 토큰 — 컬러
 *
 * 피그마 컬러팔레트(노드 350:477) + 컴포넌트에서 추출한 raw 값들.
 * 절대 임의로 색을 추가하지 마세요. 피그마에 없는 색을 쓸 일이 생기면
 * 디자이너에게 토큰을 요청한 후 여기에 추가합니다.
 */

export const Colors = {
  // ── Brand ─────────────────────────────────────────────
  mainGreen: '#16af5d',

  // ── Grays ─────────────────────────────────────────────
  lightGray100: '#fafafa',   // 피그마 --light-gray100
  lightGray200: '#f2f2f2',   // 피그마 --light-gray200 (input/card surface)
  lightGray400: '#d7e2dd',   // 피그마 --light-gray400 (divider/border)
  darkGray: '#93a09a',       // 피그마 --dark-gray (보조 텍스트, placeholder)
  textHint: '#7a7a7a',       // 부가 텍스트 (홈 main-button hint)
  radioIdle: '#d9d9d9',      // radio outer idle

  // ── Base ──────────────────────────────────────────────
  white: '#ffffff',
  black: '#000000',

  // ── Backgrounds ───────────────────────────────────────
  sky: '#BFE6F5',            // HomeScreen 배경 상단 sky base
  cream: '#FFFDF7',          // WorryTimeScreen 배경
  leafBg: '#dce8c9',         // CopywriteScreen 옅은 연두 배경 (피그마 62:48)

  // ── Overlay ───────────────────────────────────────────
  backdrop: 'rgba(0,0,0,0.5)',

  // ── Semantic 별칭 (UI 코드에서 의도 명확) ─────────────
  textPrimary: '#000000',
  textSecondary: '#93a09a',
  surface: '#f2f2f2',
  border: '#d7e2dd',
  accent: '#16af5d',
  background: '#ffffff',

  // ── Backward-compatible aliases (기존 화면 코드 호환) ──
  // 새 코드는 lightGray200 / textPrimary 등 의미 있는 토큰을 사용하세요.
  lightGray: '#f2f2f2',
  darkText: '#1e1e1e',
} as const;

export type ColorToken = keyof typeof Colors;
