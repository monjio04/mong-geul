/**
 * FlowerBloomScreen — 피그마 "꽃 피는 화면" (533:620) / "새싹 피는 화면" (615:1922)
 *
 * 진입: Reward 5초 → Home reset 후 navigation.navigate('FlowerBloom') (transparentModal)
 *
 * 두 가지 변형 (status):
 *  - flower : Lottie 모션 (FLOWER_SHOW[type]) + #cbe691 연두 원
 *      제목 "오늘의 꽃이 피었어요" (오늘의 꽃 = #f1f2ac)
 *      서브 "걱정을 정리한 시간이 작은 꽃으로 남았어요\n다이어리에 같은 꽃을 남겨 마무리해요"
 *  - sprout : 정적 SVG (f-sprout.svg) + #f4f5c7 연노랑 원
 *      제목 "오늘의 새싹이 피었어요" (오늘의 새싹 = #8ebf46)
 *      서브 "걱정을 정리한 시간이 작은 새싹으로 남았어요\n다이어리에 같은 새싹을 남겨 마무리해요"
 *
 * 공통:
 *  - backdrop rgba(0,0,0,0.7)
 *  - column gap 60 (멘트 ↔ 원)
 *  - 중간멘트 (MiddleMessage 재사용) — gap 17, max-width 270
 *  - 원 185×185 rounded 999
 *
 * 탭 동작:
 *  - flower: lottie onAnimationFinish → tappable → tap → goBack
 *  - sprout: 마운트 후 800ms → tappable → tap → goBack (정적 SVG, animation 없음)
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import LottieView from 'lottie-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useResponsive } from '../theme';
import type { FlowerType } from '../storage/types';
import { MiddleMessage } from '../components/MiddleMessage';
import FSproutIcon from '../../assets/icons/f-sprout.svg';

type Props = NativeStackScreenProps<RootStackParamList, 'FlowerBloom'>;

const FLOWER_SHOW: Record<FlowerType, ReturnType<typeof require>> = {
  1: require('../../assets/lottie/flowers/flower_show_1.json'),
  2: require('../../assets/lottie/flowers/flower_show_2.json'),
  3: require('../../assets/lottie/flowers/flower_show_3.json'),
  4: require('../../assets/lottie/flowers/flower_show_4.json'),
  5: require('../../assets/lottie/flowers/flower_show_5.json'),
  6: require('../../assets/lottie/flowers/flower_show_6.json'),
  7: require('../../assets/lottie/flowers/seed_show.json'), // ← 기존 flower7 자리에 seed 사용
};

const ANIM_START = 90;
const ANIM_END = 108;

export default function FlowerBloomScreen({ route, navigation }: Props) {
  const { wp, hp } = useResponsive();
  const { status, flowerType } = route.params;
  const isSprout = status === 'sprout';

  const lottieRef = useRef<LottieView>(null);
  const [tappable, setTappable] = useState(false);

  useEffect(() => {
    if (isSprout) {
      // 정적 SVG — 짧은 딜레이 후 탭 활성화
      const t = setTimeout(() => setTappable(true), 800);
      return () => clearTimeout(t);
    } else {
      // Lottie 모션 — 끝나면 onAnimationFinish 가 tappable 켬
      lottieRef.current?.play(ANIM_START, ANIM_END);
    }
  }, [isSprout]);

  const handlePress = () => {
    if (!tappable) return;
    navigation.goBack();
  };

  const handleAnimationFinish = () => {
    setTappable(true);
  };

  // 피그마 좌표 → 반응형
  const contentTop = hp(182);
  const contentWidth = wp(262);
  const messageToCircleGap = hp(60);
  const circleSize = wp(185);

  // 멘트 색/텍스트 — status 별 분기
  const messageProps = isSprout
    ? {
        titleAccent: '오늘의 새싹',
        titleAccentColor: '#8ebf46',
        title: '이 피었어요',
        titleColor: '#ffffff',
        subtitle:
          '걱정을 정리한 시간이 작은 새싹으로 남았어요\n다이어리에 같은 새싹을 남겨 마무리해요',
        subtitleColor: '#d7e2dd', // lightGray400
      }
    : {
        titleAccent: '오늘의 꽃',
        titleAccentColor: '#f1f2ac',
        title: '이 피었어요',
        titleColor: '#ffffff',
        subtitle:
          '걱정을 정리한 시간이 작은 꽃으로 남았어요\n다이어리에 같은 꽃을 남겨 마무리해요',
        subtitleColor: '#d7e2dd',
      };

  // 원 배경색 — status 별 분기
  const circleBg = isSprout ? '#f4f5c7' : '#cbe691';

  return (
    <Pressable style={styles.root} onPress={handlePress}>
      <View
        style={[
          styles.content,
          { top: contentTop, width: contentWidth, gap: messageToCircleGap },
        ]}
        pointerEvents="none"
      >
        {/* 중간멘트 — figma 615:1923 / 533:620 (기존 컴포넌트 재사용) */}
        <MiddleMessage {...messageProps} />

        {/* 원 — bg 변경 (flower=#cbe691 / sprout=#f4f5c7) */}
        <View
          style={[
            styles.circle,
            {
              width: circleSize,
              height: circleSize,
              borderRadius: circleSize / 2,
              backgroundColor: circleBg,
            },
          ]}
        >
          {isSprout ? (
            // 새싹 — figma 649:765 (100×69.7 SVG)
            <FSproutIcon width={wp(100)} height={wp(100) * (69.7 / 100)} />
          ) : (
            // 꽃 — Lottie 모션
            <LottieView
              ref={lottieRef}
              source={FLOWER_SHOW[(flowerType ?? 1) as FlowerType]}
              autoPlay={false}
              loop={false}
              onAnimationFinish={handleAnimationFinish}
              style={{ width: wp(100), height: hp(86) }}
              resizeMode="contain"
            />
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  content: {
    position: 'absolute',
    alignSelf: 'center',
    alignItems: 'center',
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
