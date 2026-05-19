/**
 * AudioToggleIcon — 피그마 audio 컴포넌트 (192:2498)
 *
 * 상태:
 *  - enabled = true  → 음표 (♪) 단독
 *  - enabled = false → 음표 + 슬래시 (꺼짐)
 *
 * 자산:
 *  사용자가 피그마에서 export한 PNG/SVG 자산을 `assets/icons/audio_on.png`,
 *  `assets/icons/audio_off.png` 로 넣어주면 자동으로 사용.
 *  자산이 없는 동안은 Ionicons fallback (musical-notes + 대각선 슬래시).
 *
 * 자산 활성화 방법:
 *  1) `assets/icons/audio_on.png` 와 `audio_off.png` 파일 추가
 *  2) 아래 require(...) 두 줄에서 // 주석 제거
 *
 * 사용 예:
 *   <AudioToggleIcon enabled={audioOn} onPress={toggle} />
 */

import React from 'react';
import {
  Pressable, View, StyleSheet, Image, type ImageSourcePropType,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme';

// ─── 자산 require (사용자가 피그마 export 후 활성화) ────────
// const ICON_ON: ImageSourcePropType = require('../../assets/icons/audio_on.png');
// const ICON_OFF: ImageSourcePropType = require('../../assets/icons/audio_off.png');
const ICON_ON: ImageSourcePropType | null = null;
const ICON_OFF: ImageSourcePropType | null = null;

export interface AudioToggleIconProps {
  enabled: boolean;
  onPress: () => void;
  size?: number;
}

export function AudioToggleIcon({ enabled, onPress, size = 24 }: AudioToggleIconProps) {
  const hasAssets = ICON_ON !== null && ICON_OFF !== null;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={({ pressed }) => [styles.btn, { width: size, height: size }, pressed && styles.pressed]}
    >
      {hasAssets ? (
        <Image
          source={(enabled ? ICON_ON : ICON_OFF) as ImageSourcePropType}
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
      ) : (
        // Fallback: Ionicons + 슬래시 (자산 추가 전 임시)
        <View style={styles.fallbackWrap}>
          <Ionicons
            name="musical-notes"
            size={size}
            color={Colors.black}
          />
          {!enabled && (
            <View style={[styles.slash, { width: size, height: 1.5 }]} />
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: { opacity: 0.6 },
  fallbackWrap: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slash: {
    position: 'absolute',
    backgroundColor: Colors.black,
    transform: [{ rotate: '-45deg' }],
  },
});
