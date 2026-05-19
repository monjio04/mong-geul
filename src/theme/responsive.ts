/**
 * 반응형 비율 스케일 헬퍼
 *
 * 피그마는 360×800 기준으로 디자인되어 있다. 다양한 폰 화면 크기에 대응하기 위해
 * 피그마 px → 실제 디바이스 px 로 비율 스케일.
 *
 * - wp(px): 가로 비율 스케일 (피그마 360 기준)
 * - hp(px): 세로 비율 스케일 (피그마 800 기준)
 * - MAX_SCALE = 1.2 — 태블릿/Fold 같은 큰 화면에서 1.2배 이상은 캡
 *   (컨텐츠가 과도하게 커지는 것 방지)
 *
 * 폰별 스케일 예시 (가로 기준):
 *   - 갤럭시 S25 / S24 (360dp) → 1.0x  (피그마 그대로)
 *   - iPhone 14 Pro (393dp)    → 1.09x
 *   - iPhone 14 Pro Max (430dp) → 1.19x
 *   - iPhone SE (320dp)        → 0.89x  (자연 축소)
 *   - Galaxy Z Fold 펼친 상태 (600dp+) → 1.2x  (MAX_SCALE 캡)
 *   - 태블릿 (800dp)            → 1.2x  (MAX_SCALE 캡)
 *
 * 폰트 크기는 일반적으로 scale 하지 않음 (가독성). 필요 시 별도 처리.
 *
 * 사용 예 (컴포넌트 안):
 *   const { wp, hp } = useResponsive();
 *   <View style={{ width: wp(114), height: hp(120) }} />
 */

import { useWindowDimensions } from 'react-native';

export const FIGMA_W = 360;
export const FIGMA_H = 800;
export const MAX_SCALE = 1.2;

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  // 폰 비율, 단 MAX_SCALE 이상은 캡 (큰 화면에서 컨텐츠 과대화 방지)
  const wScale = Math.min(width / FIGMA_W, MAX_SCALE);
  const hScale = Math.min(height / FIGMA_H, MAX_SCALE);
  return {
    width,
    height,
    wp: (figmaPx: number) => figmaPx * wScale,
    hp: (figmaPx: number) => figmaPx * hScale,
  };
}
