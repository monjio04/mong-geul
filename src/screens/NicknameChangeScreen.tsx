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
import { Colors, Spacing, Typography } from '../theme';

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
          <Text variant="titleLarge" style={styles.question}>
            어떤 이름으로 불러드릴까요?
          </Text>
          <Text variant="xs" color="textSecondary" style={styles.hint}>
            실명이 아니어도 괜찮아요
          </Text>

          {/* 밑줄형 인풋 — 피그마 input-name(surface형)과 다른 패턴.
              현 화면 디자인을 유지하며 색만 토큰화. */}
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={(text) => {
              if (text.length <= MAX_LENGTH) setInput(text);
            }}
            placeholder={currentNickname || '기존 닉네임'}
            placeholderTextColor={Colors.textSecondary}
            maxLength={MAX_LENGTH}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleConfirm}
          />

          <Text variant="xs" color="textSecondary" style={styles.counter}>
            {input.length} / {MAX_LENGTH}
          </Text>
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

  question: {
    marginBottom: Spacing.xs, // 8
  },
  hint: {
    marginBottom: Spacing.xxxl, // 24
  },

  // 밑줄형 텍스트 인풋 (이 화면 전용 디자인)
  input: {
    ...Typography.title, // 16 semibold
    color: Colors.textPrimary,
    paddingVertical: Spacing.md, // 12
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  counter: {
    marginTop: Spacing.xs, // 8
    textAlign: 'right',
  },

});
