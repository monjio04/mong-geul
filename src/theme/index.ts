/**
 * 테마 토큰 re-export.
 *
 * 화면/컴포넌트에서:
 *   import { Colors, Typography, Spacing, Radii } from '@/theme';
 *
 * 또는:
 *   import { Colors } from '../../theme';
 */

export { Colors } from './colors';
export type { ColorToken } from './colors';

export { Typography } from './typography';
export type { TypographyVariant } from './typography';

export { Spacing, Radii } from './spacing';
export type { SpacingToken, RadiusToken } from './spacing';

export { useResponsive, FIGMA_W, FIGMA_H, MAX_SCALE } from './responsive';
