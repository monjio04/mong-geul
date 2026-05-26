/**
 * MiddleMessage — 피그마 "중간멘트" 컴포넌트 (node 215:8163, 615:1923)
 *
 * 사용처:
 *  - MemoCompleteScreen (단순 사양 — black title + #a0a0a0 subtitle)
 *  - FlowerBloomScreen (꽃/새싹) — accent prefix + 흰색 title + #d7e2dd subtitle
 *
 * 피그마 사양 (공통):
 *  - column, items center, gap 17
 *  - max-width 270, center align
 *  - title    : 24px semibold, lineHeight normal
 *  - subtitle : 15px medium, lineHeight 1.5
 *
 * 변형:
 *  - titleAccent: title 앞에 다른 색 prefix (예: "오늘의 꽃이 피었어요" 에서 "오늘의 꽃")
 *  - titleColor / titleAccentColor / subtitleColor: 색 override
 */

import React from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { Text } from './ui';

export interface MiddleMessageProps {
  /** 메인 타이틀 (titleAccent 가 있으면 그 뒤에 붙음) */
  title: string;
  /** 옵션: title 앞 강조 prefix (다른 색) */
  titleAccent?: string;
  /** 옵션: title 색 (기본 #000) */
  titleColor?: string;
  /** 옵션: titleAccent 색 (titleAccent 있을 때만 사용) */
  titleAccentColor?: string;
  subtitle: string;
  /** 옵션: subtitle 색 (기본 #a0a0a0) */
  subtitleColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function MiddleMessage({
  title,
  titleAccent,
  titleColor = '#000',
  titleAccentColor,
  subtitle,
  subtitleColor = '#a0a0a0',
  style,
}: MiddleMessageProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.title, { color: titleColor }]} align="center" allowFontScaling={false}>
        {titleAccent && (
          <Text style={[styles.title, { color: titleAccentColor ?? titleColor }]}>
            {titleAccent}
          </Text>
        )}
        {title}
      </Text>
      <Text
        style={[styles.subtitle, { color: subtitleColor }]}
        align="center"
        allowFontScaling={false}
      >
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
    letterSpacing: -0.48,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.3,
    lineHeight: 22.5, // 15 * 1.5
  },
});
