/**
 * MainButton — 홈 화면 / 온보딩 가이드에서 공용으로 쓰는 하단 메인 액션 영역.
 *
 * 피그마 매핑: components/main-button (node 112:720)
 *   - status="idle"        : 좌측 시계 박스 (00:00 + "걱정타임까지 남은 시간") + 우측 "걱정 맡겨두기"
 *   - status="worry-time"  : 좌측 "필사하기" + 우측 "걱정 정리하기"
 *
 * 레이아웃 (피그마 360 기준):
 *   container width=320, height=72, gap=8
 *   ├ 좌측 box: 132×72, idle radius 16 / worry-time radius 12
 *   └ 우측 box: 180×72, idle radius 16 / worry-time radius 12
 *
 * highlight (가이드 슬라이드 전용):
 *   - 'left'   : 우측 박스에 dim overlay (rgba(0,0,0,0.25))
 *   - 'right'  : 좌측 박스에 dim overlay
 *   - 'none'   : 좌·우 모두 dim
 *   - 'both'   : overlay 없음 (기본, Home 사용 시 그대로)
 *
 * 디자인 규칙 (design.md):
 *   - 좌·우 sub-button 은 기존 ui/Button.tsx variant 재사용 (variant='primary' / 'surface')
 *   - 단 idle 좌측은 2줄 텍스트 (00:00 + 안내) 이므로 Button.tsx 로 표현 불가
 *     → 본 wrapper 안에서만 Pressable+Text 합성으로 직접 렌더 (PrimaryButton.tsx 같은 styled
 *        variation 금지 규칙과는 다른 결, 합성 layout 컴포넌트).
 */

import React from 'react';
import { View, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { Button } from './ui/Button';
import { Text } from './ui/Text';
import { Colors, Radii } from '../theme';

export type MainButtonHighlight = 'left' | 'right' | 'both' | 'none';

export interface MainButtonProps {
  status: 'idle' | 'worry-time';
  /** idle 상태에서 표시할 카운트다운 — 기본 "00:00" */
  remainingTime?: string;
  /** worry-time 좌측 ("필사하기") 또는 idle 좌측 (탭하면 NotWorryTime 안내) */
  onPressLeft?: () => void;
  /** idle ("걱정 맡겨두기") 또는 worry-time ("걱정 정리하기") */
  onPressRight?: () => void;
  /** idle 좌측 시계 박스를 누를 수 있는지 (기본 true — Home의 NotWorryTime 안내 시트용) */
  leftPressableInIdle?: boolean;
  /** 가이드 슬라이드용 — 한쪽만 강조하고 나머지를 dim 처리 (기본 'both' = dim 없음) */
  highlight?: MainButtonHighlight;
  style?: ViewStyle;
}

export function MainButton({
  status,
  remainingTime = '00:00',
  onPressLeft,
  onPressRight,
  leftPressableInIdle = true,
  highlight = 'both',
  style,
}: MainButtonProps) {
  const isIdle = status === 'idle';
  const leftDim = highlight === 'right' || highlight === 'none';
  const rightDim = highlight === 'left' || highlight === 'none';

  // 좌·우 박스 radius (overlay clip 일치)
  const leftRadius = isIdle ? Radii.lg : Radii.md;
  const rightRadius = isIdle ? Radii.lg : Radii.md;

  return (
    <View style={[styles.row, style]}>
      {/* 좌측 박스 — 외부 wrapper로 overflow hidden 처리 (overlay가 radius 따라 잘림) */}
      <View style={[styles.leftWrap, { borderRadius: leftRadius }]}>
        {isIdle ? (
          <Pressable
            onPress={leftPressableInIdle ? onPressLeft : undefined}
            disabled={!leftPressableInIdle}
            style={styles.leftIdle}
          >
            {/* figma 109:505: Inter SemiBold 16/-0.32 → Typography.title */}
            <Text variant="title" color="darkGray" align="center">
              {remainingTime}
            </Text>
            {/* figma 109:511: Inter Medium 11/-0.22 → Typography.caption */}
            <Text variant="caption" color="darkGray" align="center">
              걱정타임까지 남은 시간
            </Text>
          </Pressable>
        ) : (
          <Button
            variant="surface"
            size="main"
            label="필사하기"
            onPress={onPressLeft}
            style={styles.leftWorryTime}
            textStyle={leftDim ? { color: Colors.textHint } : undefined}
          />
        )}
        {leftDim && <View pointerEvents="none" style={styles.dimOverlay} />}
      </View>

      {/* 우측 박스 — wrapper로 overflow hidden */}
      <View style={[styles.rightWrap, { borderRadius: rightRadius }]}>
        <Button
          variant="primary"
          size="main"
          label={isIdle ? '걱정 맡겨두기' : '걱정 정리하기'}
          onPress={onPressRight}
          style={[styles.right, !isIdle && { borderRadius: Radii.md }]}
        />
        {rightDim && <View pointerEvents="none" style={styles.dimOverlay} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 72,
    width: 320,
  },
  // 좌·우 외부 wrapper — overflow:hidden 으로 dim overlay 를 radius 따라 잘라줌
  leftWrap: {
    width: 132,
    height: 72,
    overflow: 'hidden',
  },
  rightWrap: {
    width: 180,
    height: 72,
    overflow: 'hidden',
  },
  // idle 좌측 — 2줄 텍스트 박스 (잠금 외관)
  // figma 109:504: 132×72, bg lightGray200, radius 16
  // 텍스트 배치 (figma 109:505 / 109:511):
  //   "00:00"   top calc(50% - 16px) = 20px from top
  //   "걱정타임…" top calc(50% + 3px)  = 39px from top
  //   → flex center + gap 0 으로 자연 정렬 (variant 자체 height 로 figma 좌표 매칭)
  leftIdle: {
    width: 132,
    height: 72,
    borderRadius: Radii.lg,
    backgroundColor: Colors.lightGray200,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  // worry-time 좌측 — 필사하기 (radius 12)
  leftWorryTime: {
    width: 132,
    borderRadius: Radii.md,
  },
  // 우측 — 기본 16, worry-time 12
  right: {
    width: 180,
  },
  // 비활성 박스 위에 얹는 dim overlay — wrapper가 overflow:hidden + radius 라 자동 clip
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.backdrop,
  },
});
