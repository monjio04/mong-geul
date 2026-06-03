/**
 * BottomButton — 피그마 "bottom" (677:768 / 844:2803) wrapper 사양.
 *
 * 피그마 구조:
 *   bottom (677:768) — items-start
 *   └─ bottom (679:852) — w:360, pt:10, pb:60, px:20
 *      └─ BottomButton (primary, w:full, py:19, rounded:16) — h ≈ 56
 *
 * 사용처: 화면 하단 CTA — "다음", "완료", "작성 완료" 등.
 *   - Memo, Copywrite, WorryTime, WorryTimeEntry, NicknameChange,
 *     Onboarding 시리즈, DelayPicker 등 단일 primary 버튼.
 *
 * 사양:
 *   - 화면 하단에 absolute fixed.
 *   - 좌우 20dp 패딩 → 내부 버튼 w:full.
 *   - 상단 10dp 패딩 (콘텐츠와의 안전 마진).
 *   - 하단 60dp 패딩 — figma 844:2803 변경 (이전 45 → 60, 네비바 안전 여유 ↑).
 *   - 내부 버튼은 공용 Button 컴포넌트 (variant primary, size lg, full width).
 *
 * 사용 예:
 *   <BottomButton label="작성 완료" onPress={handleSubmit} disabled={!canSubmit} />
 */

import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { Button, type ButtonProps } from './Button';
import { useResponsive } from '../../theme';

// variant/size/fullWidth/style 는 bottom-button 사양으로 고정 → 외부 노출 안 함
export interface BottomButtonProps
  extends Omit<ButtonProps, 'variant' | 'size' | 'fullWidth' | 'style'> {
  /** 외부 컨테이너 style override — 보통 불필요 (컴포넌트가 자체 bottom anchor). */
  containerStyle?: ViewStyle;
  /** 키보드 등 화면 상태에 따라 띄울 때 — 기본 0 */
  bottomOffset?: number;
  /** 내부 버튼 textStyle (label 색/크기 미세 조정) */
  textStyle?: ButtonProps['textStyle'];
}

export function BottomButton({
  containerStyle,
  bottomOffset = 0,
  textStyle,
  ...buttonProps
}: BottomButtonProps) {
  const { wp, hp } = useResponsive();

  return (
    <View
      style={[
        styles.container,
        {
          // figma 844:2803 — pt:10, pb:60, px:20
          paddingTop: hp(10),
          paddingBottom: hp(60),
          paddingHorizontal: wp(20),
          bottom: bottomOffset,
        },
        containerStyle,
      ]}
    >
      <Button
        variant="primary"
        size="lg"
        fullWidth
        textStyle={textStyle}
        {...buttonProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
