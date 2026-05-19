/**
 * 공용 ProgressBar 컴포넌트.
 *
 * 피그마: onboarding-progress (133:496) — status=1/2/3/4 variants.
 * 4개 segment 가로 배치, 현재까지 mainGreen / 이후는 lightGray200.
 * 우측 정렬 카운터 "1/4" 표시.
 *
 * 4개 온보딩 화면 (Nickname, Survey, Time, Permission) 에 동일 컴포넌트로 재사용.
 *
 * 사용 예:
 *   <ProgressBar current={1} total={4} />
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './ui/Text';
import { Colors } from '../theme';

export interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.barRow}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.seg,
              { backgroundColor: i < current ? Colors.mainGreen : Colors.lightGray200 },
            ]}
          />
        ))}
      </View>
      <Text variant="xsMedium" color="darkGray" align="right">
        {current}/{total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  barRow: { flexDirection: 'row', gap: 4 },
  seg: { flex: 1, height: 4, borderRadius: 2 },
});
