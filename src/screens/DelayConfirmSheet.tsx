/**
 * 미루기 확인 모달 (DelayConfirmSheet)
 *
 * 진입: 2차 알림 액션 "걱정타임 미루기" 탭 → App.tsx 핸들러가
 *       navigate('Home') → navigate('DelayConfirm') → 홈 위에 모달 표시
 *
 * 디자인: 홈 화면 위에 떠 있는 transparentModal (홈이 뒤로 보임)
 *   - Card variant="warning" (피그마 worry-warning 사양)
 *   - 제목 "조금 이따 다시 만날까요?"
 *   - 본문 + 두 버튼
 *
 * 흐름:
 *  - "지금 작성할래요" → navigation.reset(Home)
 *  - "잠시 미룰래요" → canDelay 점검 → TimePickerSheet → applyDelay → reset(Home)
 */

import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Button, Card, Text } from '../components/ui';
import { TimePickerSheet } from '../components/TimePickerSheet';
import { Colors, Spacing } from '../theme';
import { getUserProfile, getTimerState } from '../storage/storage';
import { applyDelay } from '../timer/timerService';
import { canDelay, getDelayPickerRange } from '../timer/worryTimeWindow';

type Props = NativeStackScreenProps<RootStackParamList, 'DelayConfirm'>;

export default function DelayConfirmSheet({ navigation }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerInitial, setPickerInitial] = useState<{ hour: number; minute: number }>(() => {
    const min = new Date(Date.now() + 10 * 60 * 1000); // 현재 + 10분
    return { hour: min.getHours(), minute: min.getMinutes() };
  });
  // picker 범위 — 현재 + 10분 ~ 다음 04:00
  const [pickerRange] = useState(() => getDelayPickerRange(new Date()));

  // 홈으로 reset (걱정타임 active 상태 홈 화면)
  const goHome = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  // "지금 작성할래요" — 홈으로
  const handleStartNow = () => {
    goHome();
  };

  // "잠시 미룰래요" — canDelay 점검 + TimePickerSheet 열기
  const handleDelay = async () => {
    const profile = await getUserProfile();
    const state = await getTimerState();
    if (!profile) {
      goHome();
      return;
    }
    const now = new Date();
    const ok = canDelay({
      worryTime: profile.worryTime,
      isDelayed: state.isDelayed,
      isAdvanced: state.isAdvanced,
      now,
    });
    if (!ok) {
      Alert.alert('미루기 불가', '이미 이번 사이클에서 미루기를 사용했어요.');
      return;
    }

    // picker 초기값: 현재 + 10분
    const min = new Date(now.getTime() + 10 * 60 * 1000);
    setPickerInitial({ hour: min.getHours(), minute: min.getMinutes() });
    setShowPicker(true);
  };

  // 시간 선택 완료 → applyDelay → DelaySet 모달 표시
  // 검증 실패 시 string 반환 → TimePickerSheet 가 toast 표시 + picker 유지 (figma 615:1919)
  const handleConfirmTime = async (
    hour: number,
    minute: number,
  ): Promise<string | void> => {
    const now = new Date();
    const { min, max } = getDelayPickerRange(now);

    // 시각만 받았으니 오늘/내일 보정
    const candidate = new Date(min);
    candidate.setHours(hour, minute, 0, 0);
    if (candidate < min) candidate.setDate(candidate.getDate() + 1);
    if (candidate > max) {
      return '새벽 4시 전까지만 설정할 수 있어요.';
    }

    setShowPicker(false);
    await applyDelay(candidate);
    // 완료 모달로 진입 (Home 위 transparentModal)
    navigation.replace('DelaySet', { hour, minute });
  };

  return (
    <View style={styles.backdrop}>
      {/* dismiss 안 함 — 명시적 선택 필요 */}
      <Pressable style={StyleSheet.absoluteFill} />

      <Card variant="warning" style={styles.card}>
        <Text variant="titleLarge">조금 이따 다시 만날까요?</Text>

        {/* 본문 — 3줄 (figma 사양 그대로). 각 줄 별도 Text 로 독립 wrap 처리 */}
        <View style={styles.body}>
          <Text variant="xsMedium" color="darkGray" style={styles.bodyLine}>
            걱정타임을 잠시 뒤로 미룰 수 있어요.
          </Text>
          <Text variant="xsMedium" color="darkGray" style={styles.bodyLine}>
            {'다만, 걱정 미루기는 '}
            <Text variant="xsMedium" style={styles.bodyEmphasis}>하루 딱 한 번</Text>
            {'만 가능하니'}
          </Text>
          <Text variant="xsMedium" color="darkGray" style={styles.bodyLine}>
            신중하게 결정해 주세요.
          </Text>
        </View>

        <View style={styles.buttonRow}>
          <Button
            variant="secondary"
            size="md"
            label="지금 작성할래요"
            onPress={handleStartNow}
            style={styles.buttonItem}
            textStyle={{ color: Colors.textHint }}
          />
          <Button
            variant="primary"
            size="md"
            label="잠시 미룰래요"
            onPress={handleDelay}
            style={styles.buttonItem}
          />
        </View>
      </Card>

      {/* 시간 picker (모달 안 모달) — 범위: 현재+10분 ~ 다음 04:00 */}
      <TimePickerSheet
        visible={showPicker}
        initialHour={pickerInitial.hour}
        initialMinute={pickerInitial.minute}
        title="시작 시간을 선택해 주세요."
        subtitle="새벽 4시 전까지만 설정할 수 있어요."
        minDate={pickerRange.min}
        maxDate={pickerRange.max}
        onClose={() => setShowPicker(false)}
        onConfirm={handleConfirmTime}
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
    paddingHorizontal: 16,
    // maxWidth 제거 + padding 20→16 으로 텍스트 너비 확보
    // (figma 312 padding 20 사양이지만 RN 한글 폰트가 더 넓어서 wrap 방지)
  },
  body: {
    marginTop: 11, // 피그마 title↔body gap
    alignSelf: 'stretch',
  },
  bodyLine: {
    lineHeight: 18,
  },
  bodyEmphasis: {
    color: Colors.darkGray, // figma: bold + dark-gray (#93a09a) 상속
    fontWeight: '700',
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
