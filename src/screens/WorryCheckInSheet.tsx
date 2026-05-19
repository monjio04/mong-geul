/**
 * 걱정타임 2번째 완료 후 안내 모달 (WorryCheckInSheet)
 *
 * 진입: WorryTimeScreen.handleComplete 에서 누적 카운트 2일 때
 *   navigation.replace('WorryCheckIn', { from: 'worry', worryHour })
 *
 * 동작:
 *  - "충분해요" → Reward 화면 (기존 흐름)
 *  - "설정하러 가기" → Home reset 후 Settings 진입 (FocusTimeSheet 자동 열림)
 *
 * 카드는 공유 `Card` 컴포넌트(variant=outlined) 사용 — border 제거 + rounded 20 + shadow.
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Button, Card, Text } from '../components/ui';
import { Colors, Spacing } from '../theme';
import { getUserProfile } from '../storage/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'WorryCheckIn'>;

export default function WorryCheckInSheet({ route, navigation }: Props) {
  const { from, worryHour } = route.params;
  const [nickname, setNickname] = useState<string>('');

  useEffect(() => {
    (async () => {
      const p = await getUserProfile();
      if (p) setNickname(p.nickname);
    })();
  }, []);

  // "충분해요" — 보상 화면으로 정상 진행
  const handleEnough = () => {
    navigation.replace('Reward', { from, worryHour });
  };

  // "설정하러 가기" — Home reset + Settings 진입 + FocusTimePicker 자동 열림
  // history clear (CheckIn → Settings에서 뒤로가기 시 Home으로)
  const handleGoSettings = () => {
    navigation.reset({
      index: 1,
      routes: [
        { name: 'Home' },
        { name: 'Settings', params: { autoOpenFocusPicker: true } },
      ],
    });
  };

  return (
    <View style={styles.backdrop}>
      {/* backdrop은 dismiss 안 함 (사용자가 명시적 선택 필요) */}
      <Pressable style={StyleSheet.absoluteFill} />

      <Card variant="warning" style={styles.card}>
        <Text variant="titleLarge">걱정타임이 충분하셨나요?</Text>

        <Text variant="xsMedium" color="darkGray" style={styles.body}>
          {`지금 설정된 시간이 ${nickname || '회원'}님에게 잘 맞는지 궁금해요.\n시간이 부족하거나 남는다면 설정에서 바꿀 수 있어요.`}
        </Text>

        <View style={styles.buttonRow}>
          <Button
            variant="secondary"
            size="md"
            label="충분해요"
            onPress={handleEnough}
            style={styles.buttonItem}
            textStyle={{ color: Colors.textHint }}
          />
          <Button
            variant="primary"
            size="md"
            label="설정하러 가기"
            onPress={handleGoSettings}
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
  // 본문 — 12 / 500 / -0.24 / lineHeight 18 (피그마)
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
