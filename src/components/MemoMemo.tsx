/**
 * MemoMemo — 피그마 "memo-memo" 컴포넌트 (node 114:371)
 *
 * 메모 입력 박스. 공백 제외 30자 제한 + 우측 카운터.
 *
 * 피그마 사양:
 *  - bg lightGray200 (#f2f2f2), radius 18
 *  - padding 15/15/16/15 (top/right/bottom/left), gap 10
 *  - 제목 "걱정 메모" — 16px medium black
 *  - TextInput — 16px regular black, multiline
 *  - 카운터 "n/30" — 11px regular darkGray, alignSelf flex-end
 */

import React from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { Text } from './ui';
import { Colors } from '../theme';

export interface MemoMemoProps {
  value: string;
  onChangeText: (text: string) => void;
  /** 공백 제외 최대 글자수 (기본 30) */
  maxLengthExcludingSpaces?: number;
  /** TextInput autoFocus — 기본 true (메모 진입 시 키보드 자동 표시) */
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
}

function countNonSpace(text: string): number {
  return text.replace(/\s/g, '').length;
}

export function MemoMemo({
  value,
  onChangeText,
  maxLengthExcludingSpaces = 30,
  autoFocus = true,
  style,
}: MemoMemoProps) {
  // 공백 제외 길이가 max 초과면 마지막 글자 추가 거부
  const handleChange = (next: string) => {
    if (countNonSpace(next) > maxLengthExcludingSpaces) {
      return;
    }
    onChangeText(next);
  };

  const count = countNonSpace(value);

  return (
    <View style={[styles.container, style]}>
      <Text variant="title" style={styles.label}>걱정 메모</Text>

      <TextInput
        value={value}
        onChangeText={handleChange}
        multiline
        autoFocus={autoFocus}
        textAlignVertical="top"
        style={styles.input}
        allowFontScaling={false}
      />

      <View style={styles.counterRow}>
        <Text style={styles.counter}>{count}/{maxLengthExcludingSpaces}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 315,
    minHeight: 130,
    backgroundColor: Colors.lightGray200,
    borderRadius: 18,
    paddingTop: 15,
    paddingRight: 15,
    paddingBottom: 16,
    paddingLeft: 15,
    gap: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    letterSpacing: -0.32,
  },
  input: {
    flex: 1,
    minHeight: 40,
    fontSize: 16,
    fontWeight: '400',
    color: '#000',
    letterSpacing: -0.32,
    padding: 0, // RN TextInput 기본 padding 제거
  },
  counterRow: {
    alignItems: 'flex-end',
  },
  counter: {
    fontSize: 11,
    fontWeight: '400',
    color: Colors.darkGray,
    letterSpacing: -0.22,
  },
});
