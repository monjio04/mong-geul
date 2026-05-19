import React, { useState } from 'react';
import {
  View, TextInput, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ExitIcon from '../../../assets/icons/exit.svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { Button, Text } from '../../components/ui';
import { ProgressBar } from '../../components/ProgressBar';
import { OnboardingHead } from '../../components/OnboardingHead';
import { Colors, Radii, Spacing, Typography, useResponsive } from '../../theme';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingNickname'>;

// 추천 닉네임 목록
const SUGGESTED = ['초록마음', '걱정이', '하루토끼', '평온한숲', '구름이'];
const randomSuggested = SUGGESTED[Math.floor(Math.random() * SUGGESTED.length)];

export default function OnboardingNicknameScreen({ navigation }: Props) {
  const [nickname, setNickname] = useState('');
  const insets = useSafeAreaInsets();
  const { wp, hp } = useResponsive();
  // 피그마 exit y=65 (status bar 포함) → SafeAreaView inset 뺀 값
  const backBtnTop = Math.max(0, hp(65) - insets.top);

  const handleNext = () => {
    const trimmed = nickname.trim();
    if (!trimmed) return;
    navigation.navigate('OnboardingSurvey', { nickname: trimmed });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={false}
        >
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
            <ProgressBar current={1} total={4} />
          </View>

          {/* 제목 */}
          <OnboardingHead
            title="어떤 이름으로 불러드릴까요?"
            subtitle="실명이 아니어도 괜찮아요"
            style={[styles.headWrap, { paddingHorizontal: wp(20), marginBottom: hp(33) }]}
          />

          {/* 입력 — 피그마 input-name 패턴 */}
          <View style={[styles.inputSection, { paddingHorizontal: wp(20), gap: hp(8) }]}>
            <TextInput
              style={styles.input}
              placeholder={randomSuggested}
              placeholderTextColor={Colors.darkGray}
              value={nickname}
              onChangeText={(t) => t.length <= 12 && setNickname(t)}
              maxLength={12}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleNext}
            />
            <Text variant="sm" color="darkGray">
              공백 포함 12자 이내로 작성해주세요.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 하단 버튼 — 화면 끝 42dp 위 */}
      <View style={[styles.buttonWrap, { bottom: hp(42) }]}>
        <Button
          variant="primary"
          size="lg"
          label="다음"
          onPress={handleNext}
          disabled={!nickname.trim()}
          style={{ width: wp(326) }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },

  // 피그마 exit: x=20, y=65 — paddingTop은 useSafeAreaInsets로 동적 계산
  backBtn: {
    paddingLeft: Spacing.xxl, // 20
    alignSelf: 'flex-start',
  },
  // 피그마 progress y=118, exit_end=89 → gap 29
  // 피그마 head y=155, progress_end=146 → gap 9 (= marginBottom)
  progressWrap: {},
  headWrap: {},
  inputSection: {},

  // 피그마 input-name: bg lightGray200, h47, rounded 8, paddingLeft 15
  input: {
    ...Typography.bodyLarge,
    backgroundColor: Colors.lightGray200,
    borderRadius: Radii.sm,
    height: 47,
    paddingHorizontal: 15,
    color: Colors.textPrimary,
  },

  // 하단 버튼 wrap
  buttonWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
