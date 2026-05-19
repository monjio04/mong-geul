import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ExitIcon from '../../../assets/icons/exit.svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { Button, Text } from '../../components/ui';
import { ProgressBar } from '../../components/ProgressBar';
import { OnboardingHead } from '../../components/OnboardingHead';
import { Colors, Radii, useResponsive } from '../../theme';

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
  const { wp, hp } = useResponsive();
  
  // 피그마 exit y=65 → SafeAreaView inset 뺀 값
  const backBtnTop = Math.max(0, hp(65) - insets.top);

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
        <ExitIcon width={24} height={24} />
      </TouchableOpacity>

      {/* 프로그레스 */}
      <View style={[styles.progressWrap, { paddingTop: hp(29), paddingHorizontal: wp(20), marginBottom: hp(9) }]}>
        <ProgressBar current={2} total={4} />
      </View>

      {/* 제목 */}
      <OnboardingHead
        title={`하루 중 오롯이 ${nickname}님을 위해\n쓸 수 있는 시간은 언제인가요?`}
        style={[styles.headWrap, { paddingHorizontal: wp(20), marginBottom: hp(31) }]}
      />

      {/* 선택지 — 피그마 selection 컴포넌트 */}
      <View style={[styles.optionList, { paddingHorizontal: wp(24), gap: hp(12) }]}>
        {OPTIONS.map((opt) => {
          const isSelected = selected === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[
                styles.option,
                { 
                  width: wp(313),
                  height: hp(63), 
                  paddingTop: hp(10),
                  paddingRight: wp(10), 
                  paddingBottom: hp(10),
                  paddingLeft: wp(15), 
                  gap: wp(15) 
                },
                isSelected && styles.optionSelected
              ]}
              onPress={() => setSelected(opt.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.emoji}>{opt.emoji}</Text>
              <Text variant="body" style={{ fontWeight: '600' }}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 하단 버튼 — 화면 끝 42dp 위 */}
      <View style={[styles.buttonWrap, { bottom: hp(42) }]}>
        <Button
          variant="primary"
          size="lg"
          label="다음"
          onPress={handleNext}
          style={{ width: wp(326) }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },

  // 피그마 exit y=65 — paddingTop은 useSafeAreaInsets로 동적 계산
  backBtn: {
    paddingLeft: 20, // 인라인 적용 대신 StyleSheet에서 직접 wp를 쓰지 못하므로 나중에 View로 넘겨야 하지만 여기선 단순 유지
    alignSelf: 'flex-start',
  },
  progressWrap: {},
  headWrap: {},
  optionList: {
    flex: 1,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightGray200,
    borderRadius: Radii.md, // 12
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: Colors.mainGreen,
  },
  emoji: { fontSize: 20 },

  buttonWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
