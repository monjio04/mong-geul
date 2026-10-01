/**
 * 닉네임 변경 화면 — 피그마 "닉네임 변경" (217:344) 사양
 *
 * 설정 → 닉네임 옆 [변경] 버튼으로 진입.
 *
 * 피그마 절대좌표 (360×800 기준, status bar 24 baseline):
 *   - exit (226:432): x=20, y=65
 *   - header title (217:391): center-x, y=67.5 (16/500)
 *   - OnboardingHead (217:540): top=131, left=calc(50%-15) translateX(-50%) → x=30, w=270
 *   - input-name (217:538): top=217, center, w=300, h=47, rounded 8, lightGray200
 *   - bottom-button (677:847): bottom=0, pt:10 pb:60 px:20 (BottomButton 컴포넌트)
 *
 * MemoScreen / WorryTimeScreen 와 동일한 절대좌표 패턴 — status bar baseline 빼고
 * insets.top 보정해서 figma y 값 그대로 사용.
 *
 * 입력 제약: 공백 trim 후 1~12자 (MAX_LENGTH 12).
 */

import React, { useEffect, useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, TextInput, Alert, useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ExitIcon from '../../assets/icons/exit.svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { getUserProfile, saveUserProfile } from '../storage/storage';
import { BottomButton, Text } from '../components/ui';
import { OnboardingHead } from '../components/OnboardingHead';
import { Colors, Radii, withAppFont } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'NicknameChange'>;

const MAX_LENGTH = 12;
const FIGMA_STATUSBAR = 24;
const HEAD_WIDTH = 270;
const INPUT_WIDTH = 300;

export default function NicknameChangeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
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

  // figma y → 화면 y (status bar baseline 24 빼고 insets.top 보정)
  const adjustTop = (figmaY: number) => (figmaY - FIGMA_STATUSBAR) + insets.top;

  // 가로 위치는 화면 너비 기준으로 계산 (360 에서는 figma 값 30 과 동일)
  //   head : figma calc(50% - 15) + translateX(-50%) → 중심이 화면 중앙보다 15 왼쪽
  //   input: 화면 가운데
  const headLeft = screenW / 2 - 15 - HEAD_WIDTH / 2;
  const inputLeft = (screenW - INPUT_WIDTH) / 2;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* exit (x=20, y=65) — figma 226:432 */}
      <TouchableOpacity
        style={[styles.exitBtn, { top: adjustTop(65) }]}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <ExitIcon width={24} height={24} />
      </TouchableOpacity>

      {/* header title — center-x, y=67.5, 16/500 */}
      <View style={[styles.headerTitleWrap, { top: adjustTop(67.5) }]} pointerEvents="none">
        <Text variant="titleMedium">닉네임 변경</Text>
      </View>

      {/* OnboardingHead — figma 217:540 top:131, calc(50%-15) translateX -50%
          22/600 black + 15/500 darkGray, gap 8 */}
      <View style={[styles.headWrap, { top: adjustTop(131), left: headLeft }]}>
        <OnboardingHead
          title="어떤 이름으로 불러드릴까요?"
          subtitle="실명이 아니어도 괜찮아요"
        />
      </View>

      {/* input-name — figma 217:538 top:217, center, w 300, h 47
          inner box: bg lightGray200, rounded 8, pl 15 pr 10 */}
      <View style={[styles.inputBox, { top: adjustTop(217), left: inputLeft }]}>
        <TextInput
          style={withAppFont(styles.input)}
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

      {/* 완료 버튼 — figma 677:847 BottomButton (네비바 위로 띄움) */}
      <BottomButton
        label="완료"
        onPress={handleConfirm}
        disabled={!isValid}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },

  // exit (figma x=20)
  exitBtn: {
    position: 'absolute',
    left: 20,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // header title — 전체 가로 폭 안에서 가운데 정렬
  headerTitleWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  // OnboardingHead — left 는 화면 너비로 계산 (headLeft)
  headWrap: {
    position: 'absolute',
    width: HEAD_WIDTH,
  },

  // figma 217:538 input-name — w 300, h 47, left 는 화면 너비로 계산 (inputLeft)
  inputBox: {
    position: 'absolute',
    width: INPUT_WIDTH,
    height: 47,
    backgroundColor: Colors.lightGray200,
    borderRadius: Radii.sm, // 8
    paddingLeft: 15,
    paddingRight: 10,
    justifyContent: 'center',
  },
  input: {
    // figma I217:538;90:353 — 15px Semibold (placeholder=darkGray, 입력 시 textPrimary)
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
    padding: 0, // android TextInput 기본 내부 패딩 제거
  },
});
