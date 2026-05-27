/**
 * 공용 Switch 컴포넌트 — figma "switch" (node 126:688) 사양
 *
 * 디자인:
 *   - container: 36×20, radius 999 (완전 둥근 pill)
 *     · on  → bg #16af5d (mainGreen)
 *     · off → bg #93a09a (darkGray)
 *   - knob: 18×18, 흰색, radius 999, top 1px
 *     · on  → left 17px
 *     · off → left 1px
 *
 * RN 기본 <Switch> 는 OS native UI 라 figma 디자인과 다르게 보임 → 자체 구현.
 *
 * 사용 예:
 *   <Switch value={enabled} onValueChange={setEnabled} />
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { Colors } from '../../theme';

export interface SwitchProps {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  style?: ViewStyle;
}

const TRACK_W = 36;
const TRACK_H = 20;
const KNOB = 18;
const PADDING = 1;
const KNOB_OFF = PADDING;             // 1
const KNOB_ON = TRACK_W - KNOB - PADDING; // 17

export function Switch({ value, onValueChange, disabled = false, style }: SwitchProps) {
  // knob 위치 + track 색을 같은 Animated.Value 로 보간 (0=off, 1=on)
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 150,
      useNativeDriver: false, // backgroundColor / left 보간은 native driver 불가
    }).start();
  }, [value, anim]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [KNOB_OFF, KNOB_ON],
  });
  const trackColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.darkGray, Colors.mainGreen],
  });

  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      disabled={disabled}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[styles.touch, style]}
    >
      <Animated.View style={[styles.track, { backgroundColor: trackColor }]}>
        <Animated.View style={[styles.knob, { left: translateX }]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touch: {
    width: TRACK_W,
    height: TRACK_H,
  },
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: 999,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  knob: {
    position: 'absolute',
    top: PADDING,
    width: KNOB,
    height: KNOB,
    borderRadius: 999,
    backgroundColor: Colors.white,
  },
});
