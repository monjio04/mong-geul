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

// ─── 32개 preset slot ─ figma 615:1549 "#꽃밭" 정확 추출 (hand-tuning 없음) ──
//
// 꽃밭 group: left=22, top=504, w=316, h=168 (figma 360×800 기준)
// 각 instance 중심점 = (group offset + local left/top + width|height/2)
// 정규화: nx = cx / 360, ny = cy / 800
//
// 디자이너 vector instance 좌표 그대로 — design.md "Figma is single source of truth" 준수
const FIGMA_RAW_SLOTS: FlowerPosition[] = [
  { x: 0.6917, y: 0.6800 }, //  1. 615:1550 f-pink   (218,31 18×18)
  { x: 0.7694, y: 0.7538 }, //  2. 615:1551 f-navy   (246,90 18×18)
  { x: 0.7306, y: 0.7953 }, //  3. 615:1552 f-sprout (232,126 18×12.55)
  { x: 0.8694, y: 0.7525 }, //  4. 615:1553 f-orange (282,89 18×18)
  { x: 0.8111, y: 0.8213 }, //  5. 615:1554 f-purple (261,145 18×16)
  { x: 0.7528, y: 0.6438 }, //  6. 615:1555 f-purple (240,3 18×16)
  { x: 0.9139, y: 0.6413 }, //  7. 615:1556 f-green  (298,0 18×18)
  { x: 0.7861, y: 0.7066 }, //  8. 615:1557 f-sprout (252,55 18×12.55)
  { x: 0.8333, y: 0.6650 }, //  9. 615:1558 f-blue   (269,21 18×14)
  { x: 0.6611, y: 0.7328 }, // 10. 615:1559 f-sprout (207,76 18×12.55)
  { x: 0.6361, y: 0.8213 }, // 11. 615:1560 f-navy   (198,144 18×18)
  { x: 0.5639, y: 0.7775 }, // 12. 615:1561 f-blue   (172,111 18×14)
  { x: 0.5972, y: 0.7100 }, // 13. 615:1562 f-yellow (184,56 18×16)
  { x: 0.3944, y: 0.7713 }, // 14. 615:1563 f-navy   (111,104 18×18)
  { x: 0.2583, y: 0.7000 }, // 15. 615:1564 f-pink   (62,47 18×18)
  { x: 0.4389, y: 0.7075 }, // 16. 615:1565 f-blue   (127,55 18×14)
  { x: 0.1778, y: 0.7288 }, // 17. 615:1566 f-orange (33,70 18×18)
  { x: 0.8611, y: 0.7025 }, // 18. 615:1567 f-green  (279,49 18×18)
  { x: 0.4750, y: 0.7988 }, // 19. 615:1568 f-orange (140,126 18×18)
  { x: 0.3444, y: 0.8175 }, // 20. 615:1569 f-yellow (93,142 18×16)
  { x: 0.2778, y: 0.7700 }, // 21. 615:1570 f-pink   (69,103 18×18)
  { x: 0.2222, y: 0.8300 }, // 22. 615:1571 f-yellow (49,152 18×16)
  { x: 0.3667, y: 0.7325 }, // 23. 615:1572 f-pink   (101,73 18×18)
  { x: 0.5278, y: 0.7350 }, // 24. 615:1573 f-purple (159,76 18×16)
  { x: 0.3250, y: 0.6638 }, // 25. 615:1574 f-green  (86,18 18×18)
  { x: 0.2111, y: 0.6525 }, // 26. 615:1575 f-blue   (45,11 18×14)
  { x: 0.1778, y: 0.7763 }, // 27. 615:1576 f-purple (33,109 18×16)
  { x: 0.1000, y: 0.6713 }, // 28. 615:1577 f-orange (5,24 18×18)
  { x: 0.0944, y: 0.8013 }, // 29. 615:1578 f-navy   (3,128 18×18)
  { x: 0.0861, y: 0.7375 }, // 30. 615:1579 f-green  (0,77 18×18)
  { x: 0.9083, y: 0.7225 }, // 31. 615:1580 f-yellow (296,66 18×16)
  { x: 0.9139, y: 0.7988 }, // 32. 615:1581 f-blue   (298,128 18×14)
];

// ─── 시각 조정 (raw 보존, 변환만 튜닝) ─────────────────────
// figma raw 좌표 거의 그대로 — MainButton 과 안 닿게 살짝(4dp) 위로만 시프트.
//   -0.005 ≈ -4dp (800 기준)
const VERTICAL_SHIFT = -0.005; // 음수=위로, 양수=아래로 (화면 height 비율)
const SPREAD_SCALE = 1.0;      // 1.0=원본, <1=center 쪽으로 모음(덜 퍼짐), >1=더 퍼짐
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
