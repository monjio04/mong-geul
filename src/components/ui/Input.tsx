/**
 * 공용 Input 컴포넌트.
 *
 * 피그마: input-name (216:351)
 *   - 회색 표면 #f2f2f2, h 47, rounded 8, paddingLeft 15 / paddingRight 10
 *   - placeholder: 15px semibold #93a09a
 *   - 하단 hint (옵션): 13px medium #93a09a — 예) "공백 없이 12자 이내로 작성해주세요"
 *
 * 닉네임 입력 / 일반 텍스트 입력 등에 그대로 사용.
 *
 * 사용 예:
 *   <Input value={nick} onChangeText={setNick}
 *          placeholder="추천 닉네임" hint="공백 없이 12자 이내로 작성해주세요"
 *          maxLength={12} />
 */

import React from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Colors, Radii, Spacing, Typography } from '../../theme';
import { Text } from './Text';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  hint?: string;
  errorText?: string;
  style?: ViewStyle;
}

export function Input({
  hint,
  errorText,
  placeholder,
  style,
  ...rest
}: InputProps) {
  return (
    <View style={[styles.wrapper, style]}>
      <View style={styles.field}>
        <TextInput
          {...rest}
          placeholder={placeholder}
          placeholderTextColor={Colors.darkGray}
          // 시스템 폰트 크기 설정 무시
          allowFontScaling={false}
          style={styles.input}
        />
      </View>
      {hint && !errorText && (
        <Text variant="sm" color="darkGray">{hint}</Text>
      )}
      {errorText && (
        <Text variant="sm" color="mainGreen">{errorText}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.xs, // 8
    alignSelf: 'stretch',
  },
  field: {
    backgroundColor: Colors.lightGray200,
    height: 47,
    borderRadius: Radii.sm,
    paddingLeft: 15,
    paddingRight: Spacing.sm, // 10
    justifyContent: 'center',
  },
  input: {
    ...Typography.bodyLarge,
    color: Colors.textPrimary,
    padding: 0, // RN 기본 padding 제거 (Android)
    margin: 0,
  },
});
