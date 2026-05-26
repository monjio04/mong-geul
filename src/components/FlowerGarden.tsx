/**
 * FlowerGarden — Home 화면의 언덕에 꽃/새싹 idle 애니메이션 렌더
 *
 * props.records: 표시 월의 DayRecord 컬렉션 (date string → record)
 *
 * 각 record 가 status='flower'/'sprout' + position 을 가지면 그 위치(화면 비율)에
 * idle 자산을 absolute 로 배치. status='empty' 면 무시.
 *
 * 자산 (사용자 요청 — flower7 ↔ seed swap):
 *  - flower 1~6 → flower_idle_n.json (Lottie)
 *  - flower 7   → seed_idle.json     (Lottie — 기존 seed/싹 모션)
 *  - sprout     → f-sprout.svg       (정적 SVG)
 */

import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import type { DayRecord, FlowerType } from '../storage/types';
import FSproutIcon from '../../assets/icons/f-sprout.svg';

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
  7: require('../../assets/lottie/flowers/seed_idle.json'), // ← 기존 flower7 자리에 seed 사용
};

// 꽃 한 송이 사이즈 — figma 18dp는 너무 작아 가시성 위해 키움
// 38dp ≈ 10.5% — Lottie 디테일 보이면서 조밀 영역도 덜 겹침
const FLOWER_RATIO = 50 / 360; // ≈ 0.106

// type별 상대 스케일
// 1=노란, 2=베이지, 3=분홍, 4=파란, 5=보라, 6=연보라, 7=seed(싹)
const FLOWER_SIZE_SCALE: Record<FlowerType, number> = {
  1: 1.0,
  2: 1.0,
  3: 1.0,
  4: 1.0,
  5: 1.0,
  6: 1.0,
  7: 0.75, // seed(싹) lottie — sprout 와 동일 비율로 살짝 축소
};

// 새싹(sprout) SVG 사이즈 — viewBox 100×74 → 가로 기준 비율
const SPROUT_W = 100;
const SPROUT_H = 74;

// 새싹 상대 스케일 — figma 615:1549 sprout(18×12.55)이 꽃(18×16~18)보다 작은 비율 반영
const SPROUT_SIZE_SCALE = 0.75;

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
        const isSprout = r.status === 'sprout';
        // 크기: sprout 은 SPROUT_SIZE_SCALE, flower 는 type 별 scale 적용
        const scale = isSprout
          ? SPROUT_SIZE_SCALE
          : r.status === 'flower' && r.flowerType
            ? FLOWER_SIZE_SCALE[r.flowerType]
            : 1.0;
        const itemSize = size * scale;
        const left = (r.position?.x ?? 0.5) * width - itemSize / 2;
        // sprout 는 SVG height 비율 적용 (100×74 → height 74%)
        const itemHeight = isSprout ? itemSize * (SPROUT_H / SPROUT_W) : itemSize;
        const top = (r.position?.y ?? 0.85) * height - itemHeight / 2;

        if (isSprout) {
          // 새싹 — figma 사용자 제공 f-sprout.svg (정적)
          return (
            <View
              key={date}
              style={{
                position: 'absolute',
                left,
                top,
                width: itemSize,
                height: itemHeight,
              }}
            >
              <FSproutIcon width={itemSize} height={itemHeight} />
            </View>
          );
        }

        // flower 1~7 — Lottie idle
        const src = FLOWER_IDLE[r.flowerType ?? 1];
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
