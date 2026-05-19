import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { Button, Text } from '../../components/ui';
import { ProgressBar } from '../../components/ProgressBar';
import { Colors, Radii, Spacing } from '../../theme';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingSurvey'>;

type SurveyOption = {
  id: string;
  emoji: string;
  label: string;
  hour: number;
  minute: number;
};

const OPTIONS: SurveyOption[] = [
  { id: 'morning', emoji: '🌅', label: '아침에 일어나서 하루를 시작하기 전', hour: 7, minute: 0 },
  { id: 'lunch',   emoji: '☀️', label: '점심시간, 따뜻한 햇살과 함께',        hour: 12, minute: 30 },
  { id: 'evening', emoji: '🏠', label: '일과를 마치고 집에 돌아온 직후',       hour: 18, minute: 30 },
  { id: 'night',   emoji: '🛏️', label: '하루를 마무리하는 잠들기 전',          hour: 22, minute: 0 },
];

export default function OnboardingSurveyScreen({ route, navigation }: Props) {
  const { nickname } = route.params;
  const [selected, setSelected] = useState<string>(OPTIONS[0].id);
  const insets = useSafeAreaInsets();
  // 피그마 exit y=65 → SafeAreaView inset 뺀 값
  const backBtnTop = Math.max(0, 65 - insets.top);

  const handleNext = () => {
    const option = OPTIONS.find((o) => o.id === selected)!;
    navigation.navigate('OnboardingTime', {
      nickname,
      recommendedHour: option.hour,
      recommendedMinute: option.minute,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 뒤로가기 — 피그마 y=65 동적 계산 */}
      <TouchableOpacity
        style={[styles.backBtn, { paddingTop: backBtnTop }]}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-back" size={24} color={Colors.darkText} />
      </TouchableOpacity>

      {/* 프로그레스 */}
      <View style={styles.progressWrap}>
        <ProgressBar current={2} total={4} />
      </View>

      {/* 제목 */}
      <View style={styles.headWrap}>
        <Text variant="display">
          {`하루 중 오롯이 ${nickname}님을 위해\n쓸 수 있는 시간은 언제인가요?`}
        </Text>
      </View>

      {/* 선택지 — 피그마 selection 컴포넌트 (130:399), status=idle/selected */}
      <View style={styles.optionList}>
        {OPTIONS.map((opt) => {
          const isSelected = selected === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[styles.option, isSelected && styles.optionSelected]}
              onPress={() => setSelected(opt.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.emoji}>{opt.emoji}</Text>
              <Text variant="body">{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 하단 버튼 */}
      <Button
        variant="primary"
        size="lg"
        label="다음"
        onPress={handleNext}
        style={styles.button}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },

  // 피그마 exit y=65 — paddingTop은 useSafeAreaInsets로 동적 계산
  backBtn: {
    paddingLeft: Spacing.xxl, // 20
    alignSelf: 'flex-start',
  },
  // 피그마 progress y=118 (exit_end=89, gap 29)
  // 피그마 head y=155 (progress_end=146, gap 9)
  progressWrap: {
    paddingTop: 29,
    paddingHorizontal: Spacing.xxl, // 20
    marginBottom: 9,
  },
  // 피그마 head h=97 (텍스트 2줄 ~66dp + 빈 공간 31dp가 head 영역 안에 포함됨)
  // RN에서 같은 시각 효과 — text 아래 빈 여백 31dp를 marginBottom으로 추가
  headWrap: {
    paddingHorizontal: 30,
    marginBottom: 31,
  },

  // 선택 옵션 리스트
  optionList: {
    paddingHorizontal: Spacing.xxxl, // 24
    gap: Spacing.md, // 12
    flex: 1,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    height: 63, // 피그마 selection h
    backgroundColor: Colors.lightGray200,
    borderRadius: Radii.md, // 12
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: Colors.mainGreen,
  },
  emoji: { fontSize: 20 },

  // 피그마 bottom-button y=702 → marginBottom 42
  button: {
    marginHorizontal: 17,
    marginBottom: 42,
  },
});
