/**
 * 꽃 사이클 — 7종 꽃 선택 + 위치 랜덤
 *
 * 룰 (사용자 결정):
 *  - 7개 꽃 사이클 — 안 나온 type 에서 랜덤
 *  - 7개 모두 사용되면 reset (storage 비움) → 다시 7개 처음부터
 *
 * 위치:
 *  - 풀밭(언덕) 영역 안에서 랜덤 (화면 비율 0~1)
 *  - x: 10~90% / y: 75~90% (하늘 영역 제외)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../storage/keys';
import type { FlowerType, FlowerPosition } from '../storage/types';

const ALL_TYPES: FlowerType[] = [1, 2, 3, 4, 5, 6, 7];

async function getUsedTypes(): Promise<number[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.FLOWER_CYCLE_USED);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function setUsedTypes(used: number[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.FLOWER_CYCLE_USED, JSON.stringify(used));
}

/**
 * 7개 꽃 중 하나 선택 — 안 나온 type 우선, 7개 다 나오면 reset
 */
export async function pickFlowerType(): Promise<FlowerType> {
  let used = await getUsedTypes();
  // 7개 다 사용했으면 reset
  if (used.length >= 7) used = [];

  const available = ALL_TYPES.filter((n) => !used.includes(n));
  const picked = available[Math.floor(Math.random() * available.length)];

  await setUsedTypes([...used, picked]);
  return picked;
}

/**
 * 풀밭(언덕) 안 랜덤 위치 — 화면 비율 (0~1)
 */
export function pickFlowerPosition(): FlowerPosition {
  // x: 5~95% — 화면 좌우 끝까지 (꽃 size 18%라 안전 여유)
  // y: 60~85% — 풀밭 영역만 (캐릭터 발 아래 ~ main-button 위)
  //   캐릭터: top 43.25% + aspect ratio 차지 → ~53% 까지. 그 아래 grass 영역
  //   main-button: bottom 32dp + height 72dp → 화면 ~88% 부터. 그 위까지
  return {
    x: 0.05 + Math.random() * 0.9,
    y: 0.6 + Math.random() * 0.25,
  };
}
