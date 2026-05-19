import React, { useState } from 'react';
import {
  View, TextInput, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { Button, Text } from '../../components/ui';
import { ProgressBar } from '../../components/ProgressBar';
import { Colors, Radii, Spacing, Typography } from '../../theme';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingNickname'>;

// 추천 닉네임 목록
const SUGGESTED = ['초록마음', '걱정이', '하루토끼', '평온한숲', '구름이'];
const randomSuggested = SUGGESTED[Math.floor(Math.random() * SUGGESTED.length)];

export default function OnboardingNicknameScreen({ navigation }: Props) {
  const [nickname, setNickname] = useState('');
  const insets = useSafeAreaInsets();
  // 피그마 exit y=65 (status bar 포함) → SafeAreaView inset 뺀 값
  const backBtnTop = Math.max(0, 65 - insets.top);

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
            <Ionicons name="arrow-back" size={24} color={Colors.darkText} />
          </TouchableOpacity>

          {/* 프로그레스 */}
          <View style={styles.progressWrap}>
            <ProgressBar current={1} total={4} />
          </View>

          {/* 제목 */}
          <View style={styles.headWrap}>
            <Text variant="display">어떤 이름으로 불러드릴까요?</Text>
            <Text variant="bodyMedium" color="darkGray">실명이 아니어도 괜찮아요</Text>
          </View>

          {/* 입력 — 피그마 input-name 패턴 (surface 형, h47, rounded 8) */}
          <View style={styles.inputSection}>
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

      {/* 하단 버튼 */}
      <Button
        variant="primary"
        size="lg"
        label="다음"
        onPress={handleNext}
        disabled={!nickname.trim()}
        style={styles.button}
      />
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
  progressWrap: {
    paddingTop: 29,
    paddingHorizontal: Spacing.xxl, // 20
    marginBottom: 9,
  },
  // 피그마 input y=252, head_end=219 → gap 33
  headWrap: {
    paddingHorizontal: 30,
    gap: Spacing.xs, // 8
    marginBottom: 33,
  },
  inputSection: {
    paddingHorizontal: 30,
    gap: Spacing.xs, // 8
  },

  // 피그마 input-name: bg lightGray200, h47, rounded 8, paddingLeft 15
  input: {
    ...Typography.bodyLarge,
    backgroundColor: Colors.lightGray200,
    borderRadius: Radii.sm,
    height: 47,
    paddingHorizontal: 15,
    color: Colors.textPrimary,
  },

  // 피그마 bottom-button y=702, h=56 (화면 800) → marginBottom 42
  button: {
    marginHorizontal: 17,
    marginBottom: 42,
  },
});
