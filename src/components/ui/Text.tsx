/**
 * 공용 Text 컴포넌트.
 *
 * 화면에서 텍스트를 표시할 때는 React Native의 `Text` 대신 반드시 이 컴포넌트를 사용합니다.
 * 피그마에 정의된 variant 만 허용 — 임의 fontSize/fontWeight 사용 금지.
 *
 * 사용 예:
 *   <Text variant="heading">설정</Text>
 *   <Text variant="caption" color="textSecondary">데이터를 이 기기에만 저장합니다.</Text>
 *
 * 색을 따로 지정하지 않으면 textPrimary(#000)를 따릅니다.
 * 줄 간격/정렬 등은 style prop으로 오버라이드 가능하지만, 색·크기·굵기 토큰을 무시하지 마세요.
 */

import React from 'react';
import {
  Text as RNText,
  StyleSheet,
  type TextProps as RNTextProps,
  type TextStyle,
} from 'react-native';
import { Colors, Typography, type TypographyVariant, type ColorToken } from '../../theme';

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: ColorToken;
  align?: TextStyle['textAlign'];
  children?: React.ReactNode;
}

export function Text({
  variant = 'body',
  color = 'textPrimary',
  align,
  style,
  children,
  ...rest
}: TextProps) {
  return (
    <RNText
      {...rest}
      // 시스템 폰트 크기 설정 무시 — 피그마 dp 그대로 렌더링
      allowFontScaling={false}
      style={[
        styles.base,
        Typography[variant],
        { color: Colors[color] },
        align && { textAlign: align },
        style,
      ]}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  base: {
    // RN 기본 fontFamily를 비워두면 시스템 Korean 폰트(Noto Sans KR / Apple SD)가 자동 적용됨.
    includeFontPadding: false,
  },
});
