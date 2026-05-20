/**
 * MiddleMessage — 피그마 "중간멘트" 컴포넌트 (node 215:8163)
 *
 * 사용처: 메모 완료, (추후) 다른 완료/안내 화면 등 가운데 정렬 안내 멘트.
 *
 * 피그마 사양:
 *  - column, items center, gap 17
 *  - max-width 270, center align
 *  - title    : 24px semibold, black (lineHeight normal)
 *  - subtitle : 15px medium #a0a0a0, lineHeight 1.5
 */

import React from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { Text } from './ui';

export interface MiddleMessageProps {
  title: string;
  subtitle: string;
  style?: StyleProp<ViewStyle>;
}

export function MiddleMessage({ title, subtitle, style }: MiddleMessageProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title} align="center">
        {title}
      </Text>
      <Text style={styles.subtitle} align="center">
        {subtitle}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 17,
    maxWidth: 270,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    letterSpacing: -0.48,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#a0a0a0',
    letterSpacing: -0.3,
    lineHeight: 22.5, // 15 * 1.5
  },
});
