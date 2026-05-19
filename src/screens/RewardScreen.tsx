/**
 * 보상 화면 (RewardScreen) — 걱정타임/필사 완료 후 표시
 *
 * 진입:
 *  - WorryTimeScreen.handleComplete → navigation.replace('Reward', { from: 'worry', worryHour })
 *  - CopywriteScreen.handleComplete → navigation.replace('Reward', { from: 'copywrite' })
 *
 * 표시:
 *  - 제목 "오늘의 걱정타임 완료" / "오늘의 필사 완료"
 *  - 시간대별 또는 필사용 멘트
 *  - 캐릭터 Lottie + 꽃 Lottie (캐릭터 우하단에 작은 꽃 겹쳐 표시)
 *
 * 이동: 5초 자동 타이머 후 Home reset
 *
 * 반응형: wp/hp (다른 화면과 동일 패턴)
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Text } from '../components/ui';
import { Colors, useResponsive } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Reward'>;

// ─── 시간대별 멘트 (worryTime 시각 기준) ────────────────
type TimeLabel = 'morning' | 'lunch' | 'evening' | 'dawn';

interface RewardMessage {
  title: string;
  line: string;
}

const MESSAGES_BY_LABEL: Record<TimeLabel, RewardMessage> = {
  morning: {
    title: '오늘의 걱정타임 완료',
    line: '걱정은 제가 맡아둘게요.\n가벼운 마음으로 하루를 시작해볼까요?',
  },
  lunch: {
    title: '오늘의 걱정타임 완료',
    line: '걱정은 제가 맡아둘게요.\n가벼워진 마음으로 하루를 보내봐요.',
  },
  evening: {
    title: '오늘의 걱정타임 완료',
    line: '걱정은 제가 맡아둘게요.\n오늘 하루도 수고 많으셨어요!',
  },
  dawn: {
    title: '오늘의 걱정타임 완료',
    line: '걱정은 제가 맡아둘게요.\n이제 걱정 말고 편안한 밤 보내봐요.',
  },
};

// 필사 완료 시 (시간대 무관)
const COPYWRITE_MESSAGE: RewardMessage = {
  title: '오늘의 필사 완료',
  line: '좋은 문장을 천천히 따라 쓰며\n마음을 정리했어요.',
};

function getTimeLabel(worryHour: number): TimeLabel {
  if (worryHour >= 6 && worryHour < 11) return 'morning';
  if (worryHour >= 11 && worryHour < 17) return 'lunch';
  if (worryHour >= 17 && worryHour < 22) return 'evening';
  return 'dawn';
}

// 5초 자동 이동
const AUTO_NAVIGATE_MS = 5000;

const CHARACTER_LOTTIE = require('../../assets/lottie/GGuri_Reward.json');
const FLOWER_LOTTIE = require('../../assets/lottie/reward_flower.json');

export default function RewardScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { wp, hp } = useResponsive();
  const { from, worryHour } = route.params;

  // 멘트 분기
  const message: RewardMessage = from === 'copywrite'
    ? COPYWRITE_MESSAGE
    : MESSAGES_BY_LABEL[getTimeLabel(worryHour ?? 7)];

  // 5초 후 홈으로 자동 이동
  useEffect(() => {
    const id = setTimeout(() => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    }, AUTO_NAVIGATE_MS);
    return () => clearTimeout(id);
  }, [navigation]);

  // 캐릭터 사이즈 (wp 기준)
  const charSize = wp(220);
  const flowerSize = wp(80);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* 텍스트 영역 */}
      <View style={[styles.textArea, { marginTop: hp(182) }]}>
        <Text variant="display" align="center">{message.title}</Text>
        <Text
          variant="bodyMedium"
          color="darkGray"
          align="center"
          style={styles.message}
        >
          {message.line}
        </Text>
      </View>

      {/* Lottie 영역 — 캐릭터 안에 꽃이 우하단 손 부근에 겹쳐 표시 */}
      <View style={[styles.lottieArea, { marginTop: hp(92) }]}>
        <View style={{ width: charSize, height: charSize, position: 'relative' }}>
          <LottieView
            source={CHARACTER_LOTTIE}
            autoPlay
            loop
            style={{ width: charSize, height: charSize }}
            resizeMode="contain"
          />
          <LottieView
            source={FLOWER_LOTTIE}
            autoPlay
            loop
            style={{
              position: 'absolute',
              width: flowerSize,
              height: flowerSize,
              right: 0,
              bottom: wp(10),
            }}
            resizeMode="contain"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },

  // 텍스트 영역
  textArea: {
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  message: {
    lineHeight: 22,
  },

  // Lottie 영역
  lottieArea: {
    alignItems: 'center',
  },
});
