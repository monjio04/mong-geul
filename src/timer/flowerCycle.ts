/**
 * 꽃 사이클 — 7종 꽃 선택 + 위치 (32 preset slots)
 *
 * 룰 (사용자 결정):
 *  - 7개 꽃 사이클 — 안 나온 type 에서 랜덤
 *  - 7개 모두 사용되면 reset (storage 비움) → 다시 7개 처음부터
 *
 * 위치 — figma 615:1541 "메인화면-꽃 배치" 기반:
 *  - 풀밭 영역 안에 4×8 grid (32 슬롯) + 각 슬롯 deterministic jitter
 *  - 화면 비율 (0~1) 정규화로 모든 디바이스 크기에서 동일 layout
 *  - pickFlowerPosition(date) — month seed 기반 shuffle 로 day마다 다른 slot
 *    같은 month 안에서 31일 모두 서로 다른 slot 보장 (32 > 31)
 *    month가 바뀌면 새 shuffle → 다른 layout
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

// ─── 32개 preset slot ─ figma 615:1541 "메인화면-꽃 배치" / 615:1549 "#꽃밭" 추출 ──
//
// 꽃밭 group 위치: left=22, top=504, w=316, h=168 (figma 360×800 기준)
// 각 꽃 중심점 = (그룹 offset + 꽃 local left/top + 꽃 width|height/2)
// 정규화: x = 중심cx / 360, y = 중심cy / 800
//
// 디자이너가 individual vector instance로 배치 → 좌표 그대로 사용 (디자인 100% 매칭)

// figma 좌표 + 사용자 피드백으로 우상단 조밀 영역 spread (slot 1,8,9,18 등)
const FIGMA_RAW_SLOTS: FlowerPosition[] = [
  { x: 0.78, y: 0.66 },     // 1. f-pink   ✱ 8/9/18과 거리 늘림
  { x: 0.7694, y: 0.7538 }, // 2. f-navy
  { x: 0.7306, y: 0.7975 }, // 3. f-yellow
  { x: 0.8694, y: 0.7525 }, // 4. f-orange
  { x: 0.8111, y: 0.8213 }, // 5. f-purple
  { x: 0.7528, y: 0.6438 }, // 6. f-purple
  { x: 0.9139, y: 0.6375 }, // 7. f-green
  { x: 0.72, y: 0.71 },     // 8. f-yellow ✱ LEFT 으로 이동 (1과 분리)
  { x: 0.88, y: 0.64 },     // 9. f-blue   ✱ RIGHT-UP (1과 분리)
  { x: 0.6611, y: 0.7363 }, // 10. f-pink
  { x: 0.6361, y: 0.8213 }, // 11. f-navy
  { x: 0.5639, y: 0.7775 }, // 12. f-blue
  { x: 0.5972, y: 0.7100 }, // 13. f-yellow
  { x: 0.3944, y: 0.7713 }, // 14. f-navy
  { x: 0.2583, y: 0.7000 }, // 15. f-pink
  { x: 0.4389, y: 0.7075 }, // 16. f-blue
  { x: 0.1778, y: 0.7288 }, // 17. f-orange
  { x: 0.84, y: 0.69 },     // 18. f-green ✱ 살짝 LEFT (4와 분리)
  { x: 0.4750, y: 0.7988 }, // 19. f-orange
  { x: 0.3444, y: 0.8188 }, // 20. f-navy
  { x: 0.2778, y: 0.7700 }, // 21. f-pink
  { x: 0.2222, y: 0.8300 }, // 22. f-yellow
  { x: 0.3667, y: 0.7325 }, // 23. f-pink
  { x: 0.5278, y: 0.7350 }, // 24. f-purple
  { x: 0.3250, y: 0.6600 }, // 25. f-green
  { x: 0.2111, y: 0.6525 }, // 26. f-blue
  { x: 0.1778, y: 0.7763 }, // 27. f-purple
  { x: 0.1000, y: 0.6713 }, // 28. f-orange
  { x: 0.0944, y: 0.8013 }, // 29. f-navy
  { x: 0.0861, y: 0.7338 }, // 30. f-green
  { x: 0.94, y: 0.71 },     // 31. f-yellow ✱ RIGHT 으로 이동
  { x: 0.9139, y: 0.7988 }, // 32. f-blue

  // ─── 추가 슬롯 — figma 배경 이미지의 하단/중앙 꽃 매칭 ─────
  // figma vector instance는 #꽃밭 group(y=0.63~0.82)만 다루지만,
  // 배경 bitmap에는 그 아래/사이에도 꽃이 그려져 있음. 시각 밀도 맞추기 위해 추가.
  { x: 0.15, y: 0.87 },     // 33. 하단-왼쪽
  { x: 0.32, y: 0.89 },     // 34. 하단-왼쪽중간
  { x: 0.48, y: 0.87 },     // 35. 하단-중앙왼쪽
  { x: 0.62, y: 0.89 },     // 36. 하단-중앙
  { x: 0.78, y: 0.87 },     // 37. 하단-오른쪽중간
  { x: 0.92, y: 0.89 },     // 38. 하단-오른쪽
  { x: 0.42, y: 0.82 },     // 39. 중앙 under-character 영역
  { x: 0.55, y: 0.84 },     // 40. 중앙 under-character 영역
];

// ─── 시각 조정 (raw 보존, 변환만 튜닝) ─────────────────────
// 현재: 변환 없이 figma raw 좌표 그대로 사용
// (필요 시 SHIFT/SCALE 값만 조정해서 전체 layout 튜닝 가능)
const VERTICAL_SHIFT = 0;  // 음수=위로, 양수=아래로 (화면 height 비율)
const SPREAD_SCALE = 1.0;  // 1.0=원본, <1=center 쪽으로 모음(덜 퍼짐), >1=더 퍼짐
// 변환 기준점 (figma raw 좌표의 중앙)
const CENTER_X = 0.5;
const CENTER_Y = 0.73375;

export const PRESET_FLOWER_SLOTS: FlowerPosition[] = FIGMA_RAW_SLOTS.map((p) => ({
  x: CENTER_X + (p.x - CENTER_X) * SPREAD_SCALE,
  y: CENTER_Y + (p.y - CENTER_Y) * SPREAD_SCALE + VERTICAL_SHIFT,
}));

// ─── seeded shuffle (Fisher-Yates with LCG) ───────────────

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let rng = Math.abs(seed) || 1;
  for (let i = result.length - 1; i > 0; i--) {
    rng = (rng * 9301 + 49297) % 233280;
    const j = Math.floor((rng / 233280) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 특정 날짜에 해당하는 풀밭 위치 반환
 * - 같은 month 안의 day 1..31 → 32 slot 중 서로 다른 slot 보장 (deterministic shuffle)
 * - month 바뀌면 새 shuffle → 다른 layout
 * - 같은 year + month + day → 항상 같은 slot (재현성)
 */
export function pickFlowerPosition(date: Date = new Date()): FlowerPosition {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1..12
  const day = date.getDate(); // 1..31

  // year + month seed → 32 slot의 shuffle 순서 결정
  const seed = year * 100 + month;
  const slotOrder = seededShuffle(
    Array.from({ length: PRESET_FLOWER_SLOTS.length }, (_, i) => i),
    seed,
  );

  // day 1 → slotOrder[0], day 2 → slotOrder[1], ...
  const slotIndex = slotOrder[(day - 1) % PRESET_FLOWER_SLOTS.length];
  return PRESET_FLOWER_SLOTS[slotIndex];
}
