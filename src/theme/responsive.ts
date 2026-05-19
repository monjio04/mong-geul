/**
 * 반응형 비율 스케일 헬퍼
 *
 * 피그마는 360×800 기준으로 디자인되어 있다. 다양한 폰 화면 크기에 대응하기 위해
 * 피그마 px → 실제 디바이스 px 로 비율 스케일.
 *
 * 사용 예 (컴포넌트 안):
 *   const { wp, hp } = useResponsive();
 *   <View style={{ width: wp(114), height: hp(120) }} />
 *
 * - wp(px): 가로 비율 스케일 (피그마 360 기준)
 * - hp(px): 세로 비율 스케일 (피그마 800 기준)
 *
 * 폰트 크기는 일반적으로 scale 하지 않음 (가독성). 필요 시 별도 처리.
 */

import { useWindowDimensions } from 'react-native';

export const FIGMA_W = 360;
export const FIGMA_H = 800;

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const wp = (figmaPx: number) => (figmaPx * width) / FIGMA_W;
  const hp = (figmaPx: number) => (figmaPx * height) / FIGMA_H;
  return { width, height, wp, hp };
}
