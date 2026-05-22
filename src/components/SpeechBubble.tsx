/**
 * SpeechBubble — 피그마 speechbubble 컴포넌트
 *
 * 구조 (column gap 2):
 *  ┌──────────────────────────┐
 *  │     본체 bubble          │
 *  └──────────────────────────┘
 *                        ▔▔  ← 꼬리 1 (9x6 캡슐)
 *                          ●  ← 꼬리 2 (5x5 원)
 *
 * 두 가지 변형 (figma):
 *  - copywrite/worry (257:361): items-end (꼬리 우측), w=210, 13px medium
 *  - main 화면 (301:5876): items-center (꼬리 중앙), w=auto, 12px medium
 *
 * 사양:
 *  - 본체 bg lightGray100, rounded-full, paddingX 20 paddingY 10
 *  - drop-shadow: 본체 (0, 2, 2, 0.1), 꼬리들 (0, 2, 4, 0.1)
 *
 * 사용 예:
 *   <SpeechBubble text="한 글자씩 적어도 충분해요." />
 *   <SpeechBubble tailAlign="center" width="auto">
 *     <Text variant="xsMedium">지금은 <Text color="mainGreen">걱정타임</Text>이에요!</Text>
 *   </SpeechBubble>
 */

import React from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { Text } from './ui/Text';
import { Colors, Spacing, Radii } from '../theme';

export interface SpeechBubbleProps {
  /** 단순 텍스트 모드 — children 미지정 시 표시 */
  text?: string;
  /** 풍부한 콘텐츠(중첩 Text 등). 지정 시 text 무시 */
  children?: React.ReactNode;
  /** 꼬리 정렬 — 'end' 기본 (캐릭터 좌상단 말풍선) / 'center' (캐릭터 머리 위 말풍선) */
  tailAlign?: 'end' | 'center';
  /** 본체 너비 — 기본 210 (copywrite/worry 사양), 'auto' 면 콘텐츠만큼 */
  width?: number | 'auto';
  /** 본체 스타일 override */
  bubbleStyle?: StyleProp<ViewStyle>;
}

export function SpeechBubble({
  text,
  children,
  tailAlign = 'end',
  width = 210,
  bubbleStyle,
}: SpeechBubbleProps) {
  const wrapAlign = tailAlign === 'center' ? 'center' : 'flex-end';
  const bubbleW: ViewStyle = width === 'auto' ? {} : { width };

  return (
    <View style={[styles.wrap, { alignItems: wrapAlign }]}>
      <View style={[styles.bubble, bubbleW, bubbleStyle]}>
        {children ?? (
          <Text variant="sm" align="center" style={styles.bubbleText}>
            {text}
          </Text>
        )}
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
    gap: 2,
  },
  bubble: {
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
