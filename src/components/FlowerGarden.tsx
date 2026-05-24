/**
 * FlowerGarden — Home 화면의 언덕에 꽃/새싹 idle 애니메이션 렌더
 *
 * props.records: 표시 월의 DayRecord 컬렉션 (date string → record)
 *
 * 각 record 가 status='flower'/'sprout' + position 을 가지면 그 위치(화면 비율)에
 * idle Lottie 를 absolute 로 배치. status='empty' 면 무시.
 *
 * 자산:
 *  - flower 1~7 → flower_idle_n.json
 *  - sprout    → seed_idle.json
 */

import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import type { DayRecord, FlowerType } from '../storage/types';

interface FlowerGardenProps {
  records: Record<string, DayRecord>;
}

const FLOWER_IDLE: Record<FlowerType, ReturnType<typeof require>> = {
  1: require('../../assets/lottie/flowers/flower_idle_1.json'),
  2: require('../../assets/lottie/flowers/flower_idle_2.json'),
  3: require('../../assets/lottie/flowers/flower_idle_3.json'),
  4: require('../../assets/lottie/flowers/flower_idle_4.json'),
  5: require('../../assets/lottie/flowers/flower_idle_5.json'),
  6: require('../../assets/lottie/flowers/flower_idle_6.json'),
  7: require('../../assets/lottie/flowers/flower_idle_7.json'),
};
const SEED_IDLE = require('../../assets/lottie/flowers/seed_idle.json');

// 꽃 한 송이 사이즈 — figma 18dp는 너무 작아 가시성 위해 키움
// 38dp ≈ 10.5% — Lottie 디테일 보이면서 조밀 영역도 덜 겹침
const FLOWER_RATIO = 50 / 360; // ≈ 0.106

// type별 상대 스케일 — figma 615:1549 에서 f-green 은 18×12 로 다른 꽃(18×16~18) 보다 작음
// 1=노란, 2=베이지, 3=분홍, 4=파란, 5=보라, 6=연보라, 7=초록
const FLOWER_SIZE_SCALE: Record<FlowerType, number> = {
  1: 1.0,
  2: 1.0,
  3: 1.0,
  4: 1.0,
  5: 1.0,
  6: 1.0,
  7: 0.7, // 초록 — figma 비율(12/18 ≈ 0.67) 참고하여 살짝 더 크게
};

export function FlowerGarden({ records }: FlowerGardenProps) {
  const { width, height } = useWindowDimensions();
  const size = width * FLOWER_RATIO;

  // status가 flower/sprout 이고 position 이 있는 record 만 렌더
  const items = Object.entries(records).filter(([, r]) => {
    if (r.status !== 'flower' && r.status !== 'sprout') return false;
    if (!r.position) return false;
    return true;
  });

  // 디버그 로그 — record 갯수 + 표시 갯수
  if (__DEV__) {
    console.log(
      '[FlowerGarden] records:',
      Object.keys(records).length,
      '→ visible:',
      items.length,
    );
  }

  return (
    <View style={styles.root} pointerEvents="none">
      {items.map(([date, r]) => {
        const src =
          r.status === 'flower' && r.flowerType
            ? FLOWER_IDLE[r.flowerType]
            : SEED_IDLE;
        // type별 상대 스케일 적용 (초록만 작게)
        const scale = r.status === 'flower' && r.flowerType
          ? FLOWER_SIZE_SCALE[r.flowerType]
          : 1.0;
        const itemSize = size * scale;
        const left = (r.position?.x ?? 0.5) * width - itemSize / 2;
        const top = (r.position?.y ?? 0.85) * height - itemSize / 2;
        return (
          <LottieView
            key={date}
            source={src}
            autoPlay
            loop
            style={{
              position: 'absolute',
              left,
              top,
              width: itemSize,
              height: itemSize,
            }}
            resizeMode="contain"
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
});
