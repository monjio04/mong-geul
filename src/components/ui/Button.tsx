/**
 * 공용 Button 컴포넌트.
 *
 * 피그마 매핑:
 *  - variant="primary"    : 메인 그린 버튼 (#16af5d, 흰 글씨)
 *      · bottom-button   : size="lg" (h56, radius lg)
 *      · main 오른쪽    : size="xl" (h72, radius lg)
 *  - variant="secondary"  : 회색 버튼 (#f2f2f2, 검정 글씨)
 *      · main 왼쪽 idle : size="xl" (h72, radius lg)
 *  - variant="surface"    : 더 옅은 회색 (#fafafa, 검정 글씨)
 *      · main 왼쪽 worry-time : size="xl" (h72, radius md)
 *  - variant="ghost"      : 배경 없음, 검정 글씨 (텍스트 버튼)
 *
 * 사이즈는 height + radius + typography 묶음을 결정합니다.
 * 너비는 외부 style로 지정 (피그마: 132, 180, 320, 325 등 화면별로 다름).
 *
 * 사용 예:
 *   <Button variant="primary" size="lg" label="완료" onPress={...} style={{ width: 325 }} />
 *   <Button variant="secondary" size="xl" label="필사하기" onPress={...} />
 */

import React from 'react';
import {
  Pressable,
  StyleSheet,
  type PressableProps,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Colors, Radii } from '../../theme';
import { Text } from './Text';
import type { TypographyVariant } from '../../theme';

type ButtonVariant = 'primary' | 'secondary' | 'surface' | 'ghost';
type ButtonSize = 'md' | 'lg' | 'xl' | 'main';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  label: string;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

// ─── 토큰 매핑 ──────────────────────────────────────────

const VARIANT_BG: Record<ButtonVariant, string> = {
  primary: Colors.mainGreen,
  secondary: Colors.lightGray200,
  surface: Colors.lightGray100,
  ghost: 'transparent',
};

const VARIANT_TEXT_COLOR: Record<ButtonVariant, keyof typeof Colors> = {
  primary: 'white',
  secondary: 'textPrimary',
  surface: 'textPrimary',
  ghost: 'textPrimary',
};

// 각 사이즈의 height / radius / typography
// "main" = 홈 main-button 전용 (피그마 main-button 컴포넌트, h72/radius16/18px bold)
//   xl과 동일 값이지만 호출처 의도(홈 메인 CTA)를 분명히 하기 위해 별도 토큰.
//   worry-time 좌측 박스(radius 12)는 호출처에서 style prop 으로 override.
const SIZE_HEIGHT: Record<ButtonSize, number> = {
  md: 47,
  lg: 56,
  xl: 72,
  main: 72,
};
const SIZE_RADIUS: Record<ButtonSize, number> = {
  md: Radii.sm,
  lg: Radii.lg,
  xl: Radii.lg,
  main: Radii.lg,
};
const SIZE_TYPOGRAPHY: Record<ButtonSize, TypographyVariant> = {
  md: 'body',
  lg: 'bodyLarge',
  xl: 'titleLarge',
  main: 'titleLarge',
};

// ─── 컴포넌트 ──────────────────────────────────────────

export function Button({
  variant = 'primary',
  size = 'lg',
  label,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  ...pressableProps
}: ButtonProps) {
  return (
    <Pressable
      {...pressableProps}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: VARIANT_BG[variant],
          height: SIZE_HEIGHT[size],
          borderRadius: SIZE_RADIUS[size],
        },
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text
        variant={SIZE_TYPOGRAPHY[size]}
        color={VARIANT_TEXT_COLOR[variant]}
        align="center"
        style={textStyle}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fullWidth: { alignSelf: 'stretch' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
});
