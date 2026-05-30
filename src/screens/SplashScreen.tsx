/**
 * SplashScreen — 앱 시작 스플래시 (피그마 804:807 "스플래시 스크린")
 *
 * 구성 (피그마 360×800 기준, 화면 비율로 반응형):
 *  - 배경: #f4f5c7 (연노랑)
 *  - "하루틈" : MemomentKkukkukk 손글씨 40px, black, center, top=310 (38.75%)
 *  - 서브카피: "하루 한 번, 걱정을 정리하는 시간" Inter Medium 13px/-0.26, top=357 (44.6%)
 *  - 캐릭터: 피그마 export 이미지 2개 (정적), 좌표 정확 매칭
 *      · Object  (804:964): 캐릭터 — x=132 y=400 w=69.1 h=80.45
 *      · flower  (804:965): 꽃    — x=166.65 y=424.62 w=68.38 h=68.38
 *      (lottie 는 내부 padding 으로 크기/위치 어긋나 정적 export 이미지로 교체)
 *
 * RootNavigator 가 초기화 + 최소 표시 시간(약 4초) 동안 렌더. navigation 미사용.
 */

import React from 'react';
import { View, StyleSheet, Image, useWindowDimensions } from 'react-native';
import { Text } from '../components/ui';
import { Fonts } from '../theme';

const SPLASH_OBJECT = require('../../assets/images/splash_object.png'); // 캐릭터
const SPLASH_FLOWER = require('../../assets/images/splash_flower.png'); // 꽃

// figma 360×800 기준 좌표 → 디바이스 비율로 환산
const FW = 360;
const FH = 800;

export default function SplashScreen() {
  const { width: W, height: H } = useWindowDimensions();
  const sx = (px: number) => (px / FW) * W; // 가로 비율
  const sy = (px: number) => (px / FH) * H; // 세로 비율

  // figma 804:964 Object (캐릭터): x=132 y=400 w=69.108 h=80.452
  const objW = sx(69.108);
  const objStyle = {
    position: 'absolute' as const,
    left: sx(132),
    top: sy(400),
    width: objW,
    height: objW * (80.452 / 69.108), // 가로 비율 따라 높이 (aspectRatio 미사용 — percentage 버그 회피)
  };
  // figma 804:965 flower (꽃): x=166.647 y=424.618 w=68.382 h=68.382 (정사각)
  const flwW = sx(68.382);
  const flwStyle = {
    position: 'absolute' as const,
    left: sx(166.647),
    top: sy(424.618),
    width: flwW,
    height: flwW,
  };

  return (
    <View style={styles.root}>
      {/* 타이틀 "하루틈" — 손글씨 (figma 804:941) */}
      <Text style={styles.title} allowFontScaling={false}>
        하루틈
      </Text>

      {/* 서브카피 (figma 804:953) */}
      <Text style={styles.subtitle} allowFontScaling={false}>
        하루 한 번, 걱정을 정리하는 시간
      </Text>

      {/* 캐릭터 (figma Object 804:964) — 먼저 렌더 (뒤) */}
      <Image source={SPLASH_OBJECT} style={objStyle} resizeMode="contain" />

      {/* 꽃 (figma ChatGPT 이미지 804:965) — 나중 렌더 (앞) */}
      <Image source={SPLASH_FLOWER} style={flwStyle} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f4f5c7', // figma 스플래시 배경
  },
  // figma 804:941 — x center, top 310/800 = 38.75%, 40px MemomentKkukkukk
  title: {
    position: 'absolute',
    top: '38.75%',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: Fonts.handwriting,
    fontSize: 40,
    color: '#000',
  },
  // figma 804:953 — x center, top 357/800 = 44.6%, 13px medium, -0.26
  subtitle: {
    position: 'absolute',
    top: '44.6%',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.26,
    color: '#000',
  },
});
