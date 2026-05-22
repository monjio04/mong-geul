/**
 * FlowerBloomScreen — 피그마 "꽃 피는 화면" (node 533:620)
 *
 * 진입: Reward 5초 → Home reset 후 navigation.navigate('FlowerBloom') (transparentModal)
 *
 * 피그마 사양 1:1 (360×800 기준):
 *  - backdrop: rgba(0,0,0,0.7) 전체화면
 *  - 콘텐츠 column (top=182, w=262, center):
 *      └ 중간멘트 (gap 17):
 *         · 제목 24/semibold: [#f1f2ac]"오늘의 꽃"[/] + [white]"이 피었어요"[/]
 *         · 서브 15/medium #d7e2dd (lightGray400, line-height 1.5):
 *           "걱정을 정리한 시간이 작은 꽃으로 남았어요"
 *           "다이어리에 같은 꽃을 남겨 마무리해요"
 *      └ gap 60
 *      └ 원 185×185 bg #cbe691 (연두) rounded 999
 *         └ 안에 꽃 lottie (모션 한 사이클 후 정지)
 *
 * Lottie 모션:
 *  - 자산 데이터의 scale 변경이 ip=90 frame부터 시작 → ref.play(90, 108) 명시
 *  - autoPlay false, loop false. 모션 끝나면 onAnimationFinish → 탭 활성 → 탭 → goBack
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, Text as RNText } from 'react-native';
import LottieView from 'lottie-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useResponsive } from '../theme';
import type { FlowerType } from '../storage/types';

type Props = NativeStackScreenProps<RootStackParamList, 'FlowerBloom'>;

const FLOWER_SHOW: Record<FlowerType, ReturnType<typeof require>> = {
  1: require('../../assets/lottie/flowers/flower_show_1.json'),
  2: require('../../assets/lottie/flowers/flower_show_2.json'),
  3: require('../../assets/lottie/flowers/flower_show_3.json'),
  4: require('../../assets/lottie/flowers/flower_show_4.json'),
  5: require('../../assets/lottie/flowers/flower_show_5.json'),
  6: require('../../assets/lottie/flowers/flower_show_6.json'),
  7: require('../../assets/lottie/flowers/flower_show_7.json'),
};
const SEED_SHOW = require('../../assets/lottie/flowers/seed_show.json');

const ANIM_START = 90;
const ANIM_END = 108;

export default function FlowerBloomScreen({ route, navigation }: Props) {
  const { wp, hp } = useResponsive();
  const { status, flowerType } = route.params;

  const lottieRef = useRef<LottieView>(null);
  const [tappable, setTappable] = useState(false);

  const source =
    status === 'flower' && flowerType ? FLOWER_SHOW[flowerType] : SEED_SHOW;

  useEffect(() => {
    lottieRef.current?.play(ANIM_START, ANIM_END);
  }, []);

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
  const messageGap = hp(17);
  const messageToCircleGap = hp(60);
  const circleSize = wp(185);
  const lottieW = wp(100); // 피그마 꽃 100×86
  const lottieH = hp(86);

  return (
    <Pressable style={styles.root} onPress={handlePress}>
      {/* 콘텐츠 column — 멘트 + 원 */}
      <View
        style={[
          styles.content,
          { top: contentTop, width: contentWidth, gap: messageToCircleGap },
        ]}
        pointerEvents="none"
      >
        {/* 중간멘트 (column gap 17) */}
        <View style={[styles.messageWrap, { gap: messageGap }]}>
          {/* 제목 — "오늘의 꽃" 옅은 노란(#f1f2ac) + "이 피었어요" 흰색 */}
          <RNText style={styles.title} allowFontScaling={false}>
            <RNText style={styles.titleAccent}>오늘의 꽃</RNText>
            <RNText style={styles.titleWhite}>이 피었어요</RNText>
          </RNText>

          {/* 서브 — #d7e2dd, 15/medium, line-height 1.5, 두 줄 */}
          <View>
            <RNText style={styles.subtitle} allowFontScaling={false}>
              걱정을 정리한 시간이 작은 꽃으로 남았어요
            </RNText>
            <RNText style={styles.subtitle} allowFontScaling={false}>
              다이어리에 같은 꽃을 남겨 마무리해요
            </RNText>
          </View>
        </View>

        {/* 원 — bg #cbe691, 185×185 + 안에 꽃 lottie */}
        <View
          style={[
            styles.circle,
            { width: circleSize, height: circleSize, borderRadius: circleSize / 2 },
          ]}
        >
          <LottieView
            ref={lottieRef}
            source={source}
            autoPlay={false}
            loop={false}
            onAnimationFinish={handleAnimationFinish}
            style={{ width: lottieW, height: lottieH }}
            resizeMode="contain"
          />
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
  messageWrap: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.48,
    textAlign: 'center',
  },
  titleAccent: {
    color: '#f1f2ac',
  },
  titleWhite: {
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#d7e2dd', // lightGray400
    letterSpacing: -0.3,
    lineHeight: 22.5, // 15 * 1.5
    textAlign: 'center',
  },
  circle: {
    backgroundColor: '#cbe691', // 피그마 연두
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
