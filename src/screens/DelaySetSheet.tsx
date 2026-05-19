/**
 * 미루기 완료 후 안내 모달 (DelaySetSheet)
 *
 * 진입: DelayConfirmSheet → TimePickerSheet → 시간 선택 → applyDelay 성공
 *   → navigation.replace('DelaySet', { hour, minute })
 *
 * 디자인: 홈 위 transparentModal
 *   - Card variant="warning" (피그마 worry-warning 사양 재사용)
 *   - 제목: `{HH:MM}에 다시 만나요!`
 *   - 본문: 미루기 안내
 *
 * 흐름:
 *  - "다시 설정하기" → 내부 TimePickerSheet 재오픈 → 새 시각 → applyDelay 재호출 → state 갱신
 *  - "이따 만나요!" → navigation.reset(Home)
 */

import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Button, Card, Text } from '../components/ui';
import { TimePickerSheet } from '../components/TimePickerSheet';
import { Colors, Spacing } from '../theme';
import { applyDelay } from '../timer/timerService';
import { getDelayPickerRange } from '../timer/worryTimeWindow';

type Props = NativeStackScreenProps<RootStackParamList, 'DelaySet'>;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export default function DelaySetSheet({ route, navigation }: Props) {
  const [delayedTime, setDelayedTime] = useState<{ hour: number; minute: number }>({
    hour: route.params.hour,
    minute: route.params.minute,
  });
  const [showPicker, setShowPicker] = useState(false);

  // 미루기 picker 범위: 현재+10분 ~ 다음 04:00
  const now = new Date();
  const { min, max } = getDelayPickerRange(now);

  const goHome = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  const handleReSet = () => {
    setShowPicker(true);
  };

  // ⚠ setShowPicker(false)는 validation 통과 후에만 호출 — 범위 초과 시 picker 유지
  const handleConfirmNewTime = async (hour: number, minute: number) => {
    // 시각 보정 (오늘/내일 자동)
    const candidate = new Date(min);
    candidate.setHours(hour, minute, 0, 0);
    if (candidate < min) candidate.setDate(candidate.getDate() + 1);
    if (candidate > max) {
      Alert.alert('알림', '새벽 04:00까지만 미룰 수 있어요.');
      return; // picker는 그대로 유지
    }
    setShowPicker(false);
    // applyDelay 재호출 (이미 isDelayed=true 상태에서도 멱등)
    await applyDelay(candidate);
    setDelayedTime({ hour, minute });
  };

  const titleTime = `${pad2(delayedTime.hour)}:${pad2(delayedTime.minute)}`;

  return (
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} />

      <Card variant="warning" style={styles.card}>
        <Text variant="titleLarge">
          <Text variant="titleLarge" color="mainGreen">{titleTime}</Text>
          {'에 다시 만나요!'}
        </Text>

        <Text variant="xsMedium" color="darkGray" style={styles.body}>
          {'설정한 시간에 다시 알림을 보내드릴게요.\n오늘의 걱정 미루기 기회는 모두 사용했어요.'}
        </Text>

        <View style={styles.buttonRow}>
          <Button
            variant="secondary"
            size="md"
            label="다시 설정하기"
            onPress={handleReSet}
            style={styles.buttonItem}
            textStyle={{ color: Colors.textHint }}
          />
          <Button
            variant="primary"
            size="md"
            label="이따 만나요!"
            onPress={goHome}
            style={styles.buttonItem}
          />
        </View>
      </Card>

      {/* 시간 재설정 picker (모달 안 모달) */}
      <TimePickerSheet
        visible={showPicker}
        initialHour={delayedTime.hour}
        initialMinute={delayedTime.minute}
        title="언제로 미룰까요?"
        minDate={min}
        maxDate={max}
        onClose={() => setShowPicker(false)}
        onConfirm={handleConfirmNewTime}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Colors.backdrop,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxxl, // 24
  },
  card: {
    width: '100%',
    maxWidth: 340,
  },
  body: {
    lineHeight: 18,
    marginTop: 11, // 피그마 title↔body gap
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.xs, // 8
    alignSelf: 'stretch',
    marginTop: 20, // 피그마 body↔buttonRow gap
  },
  buttonItem: {
    flex: 1,
  },
});
