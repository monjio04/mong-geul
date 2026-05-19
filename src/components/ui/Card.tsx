/**
 * 공용 Card (Surface) 컴포넌트.
 *
 * 피그마 매핑:
 *  - variant="surface"  : 설정 화면 item-row, 라디오 옵션 등 (#f2f2f2, rounded 12)
 *  - variant="muted"    : 더 옅은 회색 (#fafafa, rounded 12)
 *  - variant="outlined" : 흰 배경 + 1px 보더 (#d7e2dd, rounded 12)
 *  - variant="warning"  : 피그마 worry-warning 컴포넌트 — 중앙 모달 카드
 *                         (white bg + rounded 20 + padding 24/20/24/20 (V/H) +
 *                         alignItems flex-start + drop-shadow)
 *                         · gap 없음 — 소비자가 직접 marginTop으로 간격 지정
 *                           (피그마: title↔body = 11, body↔buttonRow = 20)
 *
 * height/width 등 사이즈는 화면별 style prop으로 override.
 *
 * 사용 예:
 *   <Card variant="surface" style={{ height: 63, paddingHorizontal: 20 }}>
 *   <Card variant="warning" style={{ maxWidth: 340, width: '100%' }}>
 */

import React from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { Colors, Radii } from '../../theme';

type CardVariant = 'surface' | 'muted' | 'outlined' | 'warning';

export interface CardProps {
  variant?: CardVariant;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

const VARIANT_STYLE: Record<CardVariant, ViewStyle> = {
  surface: {
    backgroundColor: Colors.lightGray200,
  },
  muted: {
    backgroundColor: Colors.lightGray100,
  },
  outlined: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.lightGray400,
  },
  // 피그마 worry-warning 컴포넌트 사양 (padding V24/H20, gap는 소비자 책임)
  warning: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'flex-start',
    // drop-shadow (iOS + Android)
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
  },
};

export function Card({ variant = 'surface', style, children }: CardProps) {
  return (
    <View style={[styles.base, VARIANT_STYLE[variant], style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radii.md,
  },
});
