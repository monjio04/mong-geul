/**
 * 공용 Card (Surface) 컴포넌트.
 *
 * 피그마 매핑:
 *  - variant="surface"  : 설정 화면 item-row, 라디오 옵션 등 (#f2f2f2, rounded 12)
 *  - variant="muted"    : 더 옅은 회색 (#fafafa, rounded 12)
 *  - variant="outlined" : 흰 배경 + 1px 보더 (#d7e2dd, rounded 12)
 *
 * height/width/padding/flexDirection은 화면별로 다르므로 style prop으로 지정.
 * Card 자체는 표면 색 + radius만 책임. 컨텐츠 배치는 자식이 결정.
 *
 * 사용 예:
 *   <Card variant="surface" style={{ height: 63, paddingHorizontal: 20, ... }}>
 *     <Text variant="body">시작 시간</Text>
 *     {...}
 *   </Card>
 */

import React from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { Colors, Radii } from '../../theme';

type CardVariant = 'surface' | 'muted' | 'outlined';

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
