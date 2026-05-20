/**
 * MemoCompleteScreen — 피그마 "메모하기 완료 후" (node 62:1404)
 *
 * 진입: MemoScreen "작성 완료" → navigation.replace('MemoComplete')
 *
 * 표시:
 *  - MiddleMessage (y=226)
 *      title: "걱정은 우리가 맡아둘게요."
 *      subtitle: "걱정 타임에 다시 만나요"
 *  - 캐릭터+박스 일러스트 (onboarding_character_box.png, x=79 y=361 228×228)
 *
 * 흐름: 3초 자동 후 Home reset (Reward 패턴 동일)
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { MiddleMessage } from '../components/MiddleMessage';
import { Colors, useResponsive } from '../theme';

const CHARACTER_BOX = require('../../assets/images/onboarding_character_box.png');
const AUTO_NAVIGATE_MS = 3000;

type Props = NativeStackScreenProps<RootStackParamList, 'MemoComplete'>;

export default function MemoCompleteScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { wp, hp } = useResponsive();

  // 3초 후 Home reset
  useEffect(() => {
    const id = setTimeout(() => {
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    }, AUTO_NAVIGATE_MS);
    return () => clearTimeout(id);
  }, [navigation]);

  const messageTop = Math.max(0, hp(226) - insets.top);
  const imageTop = Math.max(0, hp(361) - insets.top);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 중간멘트 — 가운데 정렬 */}
      <View style={[styles.messageWrap, { top: messageTop }]}>
        <MiddleMessage
          title="걱정은 우리가 맡아둘게요."
          subtitle="걱정 타임에 다시 만나요"
        />
      </View>

      {/* 캐릭터 + 박스 일러스트 (피그마: left=79, top=361, 228×228) */}
      <Image
        source={CHARACTER_BOX}
        style={{
          position: 'absolute',
          left: wp(79),
          top: imageTop,
          width: wp(228),
          height: hp(228),
        }}
        resizeMode="contain"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  messageWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
