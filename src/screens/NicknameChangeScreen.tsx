/**
 * 닉네임 변경 화면
 *
 * 설정 → 닉네임 옆 [변경] 버튼으로 진입
 * - 헤더: ← 닉네임 변경
 * - 현재 닉네임을 placeholder로 표시
 * - 공백 포함 최대 12자 검증
 * - 하단 완료 버튼 (초록)
 */

import React, { useEffect, useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ExitIcon from '../../assets/icons/exit.svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { getUserProfile, saveUserProfile } from '../storage/storage';
import { BottomButton, Text } from '../components/ui';
import { OnboardingHead } from '../components/OnboardingHead';
import { Colors, Spacing, Radii } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'NicknameChange'>;

const MAX_LENGTH = 12;

export default function NicknameChangeScreen({ navigation }: Props) {
  const [currentNickname, setCurrentNickname] = useState('');
  const [input, setInput] = useState('');

  useEffect(() => {
    (async () => {
      const profile = await getUserProfile();
      if (profile) {
        setCurrentNickname(profile.nickname);
      }
    })();
  }, []);

  const trimmed = input.trim();
  const isValid = trimmed.length > 0 && trimmed.length <= MAX_LENGTH;

  const handleConfirm = async () => {
    if (!isValid) return;
    const profile = await getUserProfile();
    if (!profile) {
      Alert.alert('오류', '프로필 정보를 찾을 수 없어요.');
      return;
    }
    await saveUserProfile({ ...profile, nickname: trimmed });
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ExitIcon width={24} height={24} />
        </TouchableOpacity>
        <Text variant="titleMedium">닉네임 변경</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={20}
      >
        <View style={styles.bodyContent}>
          {/* figma 215:8202 onboarding-head — 22/600 black + 15/500 darkGray (gap 8) */}
          <OnboardingHead
            title="어떤 이름으로 불러드릴까요?"
            subtitle="실명이 아니어도 괜찮아요"
            style={styles.headWrap}
          />

          {/* rounded 박스 인풋 — figma 217:538 input-name
              · bg lightGray200, h 47, rounded 8, pl 15 pr 10 py 10
              · placeholder "기존 닉네임" 15/600 darkGray */}
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={(text) => {
                if (text.length <= MAX_LENGTH) setInput(text);
              }}
              placeholder={currentNickname || '기존 닉네임'}
              placeholderTextColor={Colors.darkGray}
              maxLength={MAX_LENGTH}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleConfirm}
            />
          </View>
        </View>

        {/* 완료 버튼 — figma 677:768 bottom-button (네비바 위로 띄움) */}
        <BottomButton
          label="완료"
          onPress={handleConfirm}
          disabled={!isValid}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },

  // 헤더
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxl, // 20
  },
  headerBack: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 바디
  body: { flex: 1, paddingHorizontal: Spacing.xxl }, // 20
  bodyContent: { flex: 1, paddingTop: Spacing.xl }, // 16

  // OnboardingHead 와 input 박스 사이 — figma 217:344 (head top 131 → input top 217 ≈ gap 60)
  headWrap: {
    marginBottom: 38,
  },

  // figma 217:538 input-name — w 300, gap 8
  // inner box: bg lightGray200, h 47, rounded 8, pl 15 pr 10 py 10, items-center
  inputBox: {
    width: 300,
    height: 47,
    backgroundColor: Colors.lightGray200,
    borderRadius: Radii.sm, // 8
    paddingLeft: 15,
    paddingRight: 10,
    justifyContent: 'center',
  },
  input: {
    // figma I217:538;90:353 — 15px Semibold darkGray placeholder, 입력 시 textPrimary
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
    padding: 0, // android TextInput 기본 내부 패딩 제거
  },
});
