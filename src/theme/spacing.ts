/**
 * 피그마 디자인 토큰 — Spacing & Radius
 *
 * 피그마에서 반복 출현하는 값만 토큰화. 임의값(예: 7, 11, 13)은 디자인 의도와
 * 어긋날 가능성이 높으니 사용하지 마세요.
 *
 * Spacing scale (px):
 *   xxs:  4, xs:  8, sm: 10, md: 12, lg: 14,
 *   xl:  16, xxl: 20, xxxl: 24, xxxxl: 32, xxxxxl: 40
 *
 * Radius scale (px):
 *   sm:  8 (input)
 *   md: 12 (card / item-row)
 *   lg: 16 (bottom-button / main-button / sheet)
 */

export const Spacing = {
  xxs: 4,
  xs: 8,
  sm: 10,
  md: 12,
  lg: 14,
  xl: 16,
  xxl: 20,
  xxxl: 24,
  xxxxl: 32,
  xxxxxl: 40,
} as const;

export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export type SpacingToken = keyof typeof Spacing;
export type RadiusToken = keyof typeof Radii;
