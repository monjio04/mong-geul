/**
 * "지금은 걱정타임이 아니에요!" 안내 모달
 *
 * 진입 조건: 걱정 타임 시간 외에 시작하기 버튼을 눌렀을 때
 *
 * 디자인: 중앙 카드형 모달 (피그마 메인화면-걱정타임X 기준)
 *
 * 플로우:
 *   [지금 작성할래요]
 *     → 앞당기기 시작 → 걱정 타임 화면 (다이어리 작성) → 새싹 생성
 *
 *   [이따 다시 올게요]
 *     → 홈 복귀 (원래 설정 시간 알림 유지, 아무 변화 없음)
 */

import React, { useRef, useState } from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { startAdvanced } from '../timer/timerService';
import { getTimerState } from '../storage/storage';
import { Button, Card, Text } from '../components/ui';
import { Colors, Spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'NotWorryTime'>;

export default function NotWorryTimeSheet({ navigation }: Props) {
  // 더블탭 / 사이클 중복 호출 방지
  const advancingRef = useRef(false);
  const [advancing, setAdvancing] = useState(false);

  const handleClose = () => navigation.goBack();

  const handleAdvance = async () => {
    // 1) 더블탭 방지 — ref로 즉시 차단 (useState는 비동기라 race 가능)
    if (advancingRef.current) return;
    advancingRef.current = true;
    setAdvancing(true);

    try {
      // 2) 사이클 중복 방지 — 이미 앞당기기 사용했거나 timer 진행 중이면 차단
      const state = await getTimerState();
      if (state.isAdvanced || state.startedAt) {
        Alert.alert('알림', '오늘 걱정타임은 이미 시작했어요.');
        navigation.goBack();
        return;
      }

      await startAdvanced();
      // 5초 카운트다운 진입 화면을 거쳐 WorryTime 으로
      navigation.replace('WorryTimeEntry');
    } catch (e) {
      console.error('[NotWorryTimeSheet] startAdvanced 오류:', e);
      advancingRef.current = false;
      setAdvancing(false);
    }
  };

  return (
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

      <Card variant="warning" style={styles.card}>
        <Text variant="titleLarge">지금은 걱정타임이 아니에요!</Text>

        <Text variant="xsMedium" color="darkGray" style={styles.body}>
          오늘만 시간을 바꿀까요?{'\n'}
          걱정타임은 하루에 한번만 작성할 수 있어요.
        </Text>

        <View style={styles.buttonRow}>
          <Button
            variant="secondary"
            size="md"
            label="지금 작성할래요"
            onPress={handleAdvance}
            disabled={advancing}
            style={styles.buttonItem}
            textStyle={{ color: Colors.textHint }}
          />
          <Button
            variant="primary"
            size="md"
            label="이따 다시 올게요"
            onPress={handleClose}
            disabled={advancing}
            style={styles.buttonItem}
          />
        </View>
      </Card>
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

  // Card variant="warning" 사용 — 사이즈만 override
  card: {
    width: '100%',
    maxWidth: 340,
  },
  body: {
    lineHeight: 18,
    marginTop: 11,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.xs, // 8
    alignSelf: 'stretch',
    marginTop: 20,
  },
  buttonItem: {
    flex: 1,
  },
});
