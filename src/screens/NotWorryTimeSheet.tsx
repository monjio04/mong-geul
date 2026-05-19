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

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { startAdvanced } from '../timer/timerService';
import { Button, Text } from '../components/ui';
import { Colors, Radii, Spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'NotWorryTime'>;

export default function NotWorryTimeSheet({ navigation }: Props) {
  const handleClose = () => navigation.goBack();

  const handleAdvance = async () => {
    await startAdvanced();
    navigation.replace('WorryTime');
  };

  return (
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

      <View style={styles.card}>
        <Text variant="titleLarge" style={styles.title}>
          지금은 걱정타임이 아니에요!
        </Text>

        <Text variant="sm" color="textHint" style={styles.body}>
          오늘만 시간을 바꿀까요?{'\n'}
          걱정타임은 하루에 한번만 작성할 수 있어요.
        </Text>

        <View style={styles.buttonRow}>
          <Button
            variant="secondary"
            size="md"
            label="지금 작성할래요"
            onPress={handleAdvance}
            style={styles.buttonItem}
            textStyle={{ color: Colors.textHint }}
          />
          <Button
            variant="primary"
            size="md"
            label="이따 다시 올게요"
            onPress={handleClose}
            style={styles.buttonItem}
          />
        </View>
      </View>
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
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingHorizontal: Spacing.xxxl, // 24
    paddingTop: 28,
    paddingBottom: Spacing.xxl, // 20
    // 그림자 (iOS + Android)
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
  },

  title: {
    marginBottom: Spacing.md, // 12
  },
  body: {
    lineHeight: 20,
    marginBottom: Spacing.xxxl, // 24
  },

  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.xs, // 8
  },
  buttonItem: {
    flex: 1,
  },
});
