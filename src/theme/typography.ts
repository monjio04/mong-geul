/**
 * 피그마 디자인 토큰 — 타이포그래피
 *
 * 피그마에서 반복적으로 나타나는 fontSize/weight/letterSpacing 조합을 variant로 묶음.
 * letter-spacing은 모두 -fontSize * 0.02 (피그마 tracking 규칙) 패턴.
 *
 * font weight 표기:
 *   - regular  : '400'
 *   - medium   : '500'
 *   - semibold : '600'
 *
 * Korean fallback: 'Noto Sans KR'.
 */

import type { TextStyle } from 'react-native';

type Variant = TextStyle;

export const Typography: Record<
  | 'displayLarge'   // 24 / 700  (온보딩 Welcome 타이틀)
  | 'display'        // 22 / 700  (온보딩 화면 타이틀)
  | 'heading'        // 20 / 600  (프로필 닉네임)
  | 'titleLarge'     // 18 / 600  (홈 main-button, worry-time)
  | 'titleLargeMid'  // 18 / 500  (sheet 제목, picker 시간)
  | 'title'          // 16 / 600  (섹션 제목)
  | 'titleMedium'    // 16 / 500  (헤더 타이틀, 라디오 라벨)
  | 'titleBold'      // 16 / 700  (온보딩 info-item "집중 시간")
  | 'bodyLarge'      // 15 / 600  (input placeholder, bottom-button)
  | 'bodyMedium'     // 15 / 500  (온보딩 subtitle)
  | 'bodyBold'       // 15 / 700  (온보딩 tips title)
  | 'body'           // 14 / 500  (설정 행 라벨, 시간 텍스트)
  | 'sm'             // 13 / 500  (input hint, 가이드 텍스트)
  | 'xs'             // 12 / 400  (sub label, "오전/오후")
  | 'xsMedium'       // 12 / 500
  | 'caption',       // 11 / 500  (프로필 hint)
  Variant
> = {
  displayLarge: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.48,
    lineHeight: 34,
  },
  display: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.44,
    lineHeight: 33,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  titleLarge: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.36,
  },
  titleLargeMid: {
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: -0.36,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.32,
  },
  titleMedium: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: -0.32,
  },
  titleBold: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.32,
  },
  bodyLarge: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  bodyMedium: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.3,
  },
  bodyBold: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.28,
  },
  sm: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.26,
  },
  xs: {
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: -0.24,
  },
  xsMedium: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: -0.24,
  },
  caption: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: -0.22,
  },
};

export type TypographyVariant = keyof typeof Typography;
