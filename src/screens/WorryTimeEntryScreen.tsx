/**
 * WorryTimeEntryScreen — 피그마 "걱정타임진입" (60:298)
 *
 * 진입: Home active → "걱정 정리하기" → 본 화면 → (5초 후) WorryTime
 *
 * 구성 (피그마 360×800 기준):
 *  - exit (20, 65) — 누르면 Home reset (걱정타임 active 그대로 유지)
 *  - MiddleMessage (top 182, center)
 *      title: "5초 후에 걱정타임이\n시작됩니다."
 *      subtitle: "차분한 BGM과 함께\n오늘의 걱정을 털어놓아보아요"
 *  - 회전 원 (Frame 10, 118, 362, 123×123)
 *      배경 원: lightGray200 stroke 2 (figma border-2)
 *      회전 arc: mainGreen stroke 2, 1/4 둘레, 1초에 360도 회전 (linear)
 *      가운데 숫자: 5→4→3→2→1 (32px Medium / 500)
 *  - 하단 버튼 없음 (figma 60:298 — bottom-button 미포함)
 *
 * 종료: 카운트다운 0 도달 시 자동으로 navigation.replace('WorryTime')
 *
 * 반응형: useResponsive wp/hp, useSafeAreaInsets.top 보정.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Text } from '../components/ui';
import { MiddleMessage } from '../components/MiddleMessage';
import { Colors, useResponsive } from '../theme';
import ExitIcon from '../../assets/icons/exit.svg';

type Props = NativeStackScreenProps<RootStackParamList, 'WorryTimeEntry'>;

const TOTAL_SECONDS = 5;

export default function WorryTimeEntryScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { wp, hp } = useResponsive();

  // ── 카운트다운 ──
  const [count, setCount] = useState(TOTAL_SECONDS);
  useEffect(() => {
    if (count <= 0) {
      navigation.replace('WorryTime');
      return;
    }
    const id = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [count, navigation]);

  // ── stroke fill 애니메이션 (1초 동안 0→360도 채우고 리셋) ──
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: false, // SVG attribute는 native driver 미지원
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  // ── 원 사이즈 (피그마 60:303: 123×123, border-2 = stroke 2px) ──
  const circleSize = wp(123);
  const stroke = 2;
  const r = (circleSize - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const cx = circleSize / 2;
  const cy = circleSize / 2;

  // strokeDashoffset: circ(아무것도 안 보임) → 0(전체 채움)
  const dashOffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [circ, 0],
  });

  // ── 위치 ──
  const exitTop = Math.max(0, hp(65) - insets.top);
  const messageTop = Math.max(0, hp(182) - insets.top);
  const circleTop = Math.max(0, hp(362) - insets.top);

  const handleExit = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* exit — onboarding 패턴 (paddingLeft 20 + paddingTop = hp(65)-insets.top, alignSelf flex-start) */}
      <TouchableOpacity
        style={[styles.exitBtn, { paddingTop: exitTop }]}
        onPress={handleExit}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <ExitIcon width={24} height={24} />
      </TouchableOpacity>

      {/* MiddleMessage */}
      <View style={[styles.messageWrap, { top: messageTop }]}>
        <MiddleMessage
          title={'5초 후에 걱정타임이\n시작됩니다.'}
          subtitle={'차분한 BGM과 함께\n오늘의 걱정을 털어놓아보아요'}
        />
      </View>

      {/* 회전 원 + 가운데 숫자 */}
      <View
        style={[
          styles.circleWrap,
          { top: circleTop, left: wp(118), width: circleSize, height: circleSize },
        ]}
      >
        {/* 배경 원 (옅은 회색 stroke) */}
        <Svg width={circleSize} height={circleSize} style={StyleSheet.absoluteFill}>
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            stroke={Colors.lightGray200}
            strokeWidth={stroke}
            fill="none"
          />
        </Svg>

        {/* progress arc — 0% → 100% 채우고 리셋 (1초마다) */}
        <Svg
          width={circleSize}
          height={circleSize}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <AnimatedCircle
            cx={cx}
            cy={cy}
            r={r}
            stroke={Colors.mainGreen}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={circ}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            // top(12시)부터 시작 → 시계방향으로 채워짐
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        </Svg>

        {/* 가운데 숫자 — figma 60:305: 32px Medium black */}
        <View style={styles.countCenter} pointerEvents="none">
          <Text style={styles.countText} allowFontScaling={false}>
            {count}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  exitBtn: {
    paddingLeft: 20,
    alignSelf: 'flex-start',
  },
  messageWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  circleWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // figma 60:305 — Inter Medium 32px / -0.64 / black
  countText: {
    fontSize: 32,
    fontWeight: '500',
    color: '#000',
    letterSpacing: -0.64,
    includeFontPadding: false,
  },
});
