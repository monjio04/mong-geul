/**
 * SpeechBubble — 피그마 speechbubble 컴포넌트 (257:361)
 *
 * 구조 (column gap 2, items-end / 오른쪽 끝 정렬):
 *  ┌──────────────────────────┐
 *  │     본체 bubble          │
 *  └──────────────────────────┘
 *                        ▔▔  ← 꼬리 1 (9x6 캡슐)
 *                          ●  ← 꼬리 2 (5x5 원)
 *
 * 사양:
 *  - 본체: bg #fafafa (lightGray100), rounded-full, paddingX 20 paddingY 10, w=210
 *  - 텍스트: 13px medium black, max-width 170, center, letterSpacing -0.26
 *  - drop-shadow: 본체 (0, 2, 2, 0.1), 꼬리들 (0, 2, 4, 0.1)
 *
 * 캐릭터 좌상단에 표시할 말풍선 — 캐릭터가 화면 오른쪽에 있을 때 우측 끝 정렬.
 *
 * 사용 예:
 *   <SpeechBubble text="한 글자씩 적어도 충분해요." />
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './ui/Text';
import { Colors, Spacing, Radii } from '../theme';

export interface SpeechBubbleProps {
  text: string;
}

export function SpeechBubble({ text }: SpeechBubbleProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.bubble}>
        <Text variant="sm" align="center" style={styles.bubbleText}>
          {text}
        </Text>
      </View>
      <View style={styles.tailLarge} />
      <View style={styles.tailSmall} />
    </View>
  );
}

const SHADOW_BODY = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 2,
  elevation: 2,
};

const SHADOW_TAIL = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 2,
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'column',
    alignItems: 'flex-end', // items-end (꼬리가 우측에 정렬)
    gap: 2,
  },
  bubble: {
    width: 210,
    backgroundColor: Colors.lightGray100,
    borderRadius: Radii.pill, // 999
    paddingHorizontal: Spacing.xxl, // 20
    paddingVertical: Spacing.sm, // 10
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW_BODY,
  },
  bubbleText: {
    maxWidth: 170,
    width: 170,
  },
  tailLarge: {
    width: 9,
    height: 6,
    borderRadius: Radii.pill,
    backgroundColor: Colors.lightGray100,
    ...SHADOW_TAIL,
  },
  tailSmall: {
    width: 5,
    height: 5,
    borderRadius: Radii.pill,
    backgroundColor: Colors.lightGray100,
    ...SHADOW_TAIL,
  },
});
