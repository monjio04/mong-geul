/**
 * WorryTimer — 걱정타임 진행 상태 표시 컴포넌트
 *
 * 피그마: timer (289:1069) — w=325, h=37, status=idle/selected 두 variants.
 *
 * 사양:
 *  - frame: w=325, h=37, border-radius 911.695 (반원), border 1px #D7E2DD, bg #FFF
 *  - fill: bg #F1F2AC (옅은 yellow), 좌→우 채워짐
 *  - 탭 시: fill 위에 시계 SVG 아이콘 + "MM:SS" 텍스트 오버레이 (탭 토글)
 *
 * 시계 아이콘: assets/icons/timer.svg 에서 시계 부분만 추출 (viewBox 122 11 18 18)
 *
 * 사용 예:
 *   <WorryTimer elapsedSec={120} totalSec={1200} />
 */

import React, { useState } from 'react';
import { Pressable, View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { Text } from './ui/Text';
import { Colors } from '../theme';

// ─── 시계 아이콘 SVG (timer.svg 안의 시계 path만 추출, viewBox로 영역 매핑) ───
const CLOCK_ICON_XML = `<svg viewBox="122 11 18 18" xmlns="http://www.w3.org/2000/svg" fill="none">
<path d="M124.25 20.5625C124.25 21.4489 124.425 22.3267 124.764 23.1456C125.103 23.9646 125.6 24.7087 126.227 25.3355C126.854 25.9623 127.598 26.4595 128.417 26.7987C129.236 27.1379 130.114 27.3125 131 27.3125C131.886 27.3125 132.764 27.1379 133.583 26.7987C134.402 26.4595 135.146 25.9623 135.773 25.3355C136.4 24.7087 136.897 23.9646 137.236 23.1456C137.575 22.3267 137.75 21.4489 137.75 20.5625C137.75 19.6761 137.575 18.7983 137.236 17.9794C136.897 17.1604 136.4 16.4163 135.773 15.7895C135.146 15.1627 134.402 14.6655 133.583 14.3263C132.764 13.9871 131.886 13.8125 131 13.8125C130.114 13.8125 129.236 13.9871 128.417 14.3263C127.598 14.6655 126.854 15.1627 126.227 15.7895C125.6 16.4163 125.103 17.1604 124.764 17.9794C124.425 18.7983 124.25 19.6761 124.25 20.5625Z" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M126.5 28.4376L127.54 26.3594" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M131 20.5625H128.457" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M131 16.625V20.5625" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M123.875 14.75L126.688 12.5" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M135.5 28.4374L134.46 26.3584" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M137.938 14.75L135.125 12.5" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export interface WorryTimerProps {
  elapsedSec: number;
  totalSec: number;
  style?: StyleProp<ViewStyle>;
}

export function WorryTimer({ elapsedSec, totalSec, style }: WorryTimerProps) {
  const [selected, setSelected] = useState(false);

  const progress = totalSec > 0 ? Math.min(1, elapsedSec / totalSec) : 0;
  const remainingSec = Math.max(0, totalSec - elapsedSec);
  const remainingMin = Math.floor(remainingSec / 60);
  const remainingSecOnly = remainingSec % 60;
  const timeLabel = `${String(remainingMin).padStart(2, '0')}:${String(remainingSecOnly).padStart(2, '0')}`;

  return (
    <Pressable
      style={[styles.frame, style]}
      onPress={() => setSelected((v) => !v)}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
    >
      {/* 채움 — 좌측부터 progress % */}
      <View style={[styles.barFill, { width: `${progress * 100}%` }]} />

      {/* 탭 시 시간 텍스트 + 시계 아이콘 오버레이 (fill 위) */}
      {selected && (
        <View style={styles.timeOverlay} pointerEvents="none">
          <SvgXml xml={CLOCK_ICON_XML} width={18} height={18} />
          <Text variant="bodyLarge" style={styles.timeText}>{timeLabel}</Text>
        </View>
      )}
    </Pressable>
  );
}

const RADIUS = 911.695;

const styles = StyleSheet.create({
  // 피그마: w=325, h=37, border-radius 911.695, border 1px #D7E2DD, bg #FFF
  frame: {
    width: 325,
    height: 37,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: Colors.lightGray400, // #D7E2DD
    backgroundColor: Colors.white,
    justifyContent: 'center',
    overflow: 'hidden',
  },

  // 좌측 채움 bar — bg #F1F2AC
  barFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#F1F2AC',
  },

  // 시간 + 시계 아이콘 오버레이 (탭 시) — 가운데 정렬
  timeOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
  },
  timeText: {
    // bodyLarge variant
  },
});
