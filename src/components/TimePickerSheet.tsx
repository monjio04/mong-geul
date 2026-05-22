/**
 * 공유 시간 picker 컴포넌트 — 피그마 setting-timepicker 사양 (반응형)
 *
 * 사용처:
 *  - SettingsScreen 시작 시간 변경 (제약 없음)
 *  - DelayConfirmSheet, DelaySetSheet 미루기 시간 선택 (minDate/maxDate는 parent에서 검증)
 *
 * 피그마 사양 (setting-timepicker, Frame 448):
 *   - Sheet padding: top 32 / left 18 / right 10 / bottom 30
 *   - Title ↔ picker: gap 33.5
 *   - Picker ↔ button: gap 33.5
 *   - Picker: 7 visible rows × 행 높이 ~40
 *   - 3개 휠: [시 1~12] [":"] [분 0,5,...,55] gap 30 [오전/오후]
 *   - 시 ↔ ":" gap 5, ":" ↔ 분 gap 5
 *   - 선택: Typography.displayLarge (24/700) textPrimary
 *   - 비선택: Typography.heading (20/600) lightGray400
 *   - 선택 pill: 전체 너비, lightGray200, Radii.md
 *
 * 반응형: useResponsive() wp/hp 로 360×800 → 디바이스 크기 비례 스케일 (MAX_SCALE 1.2)
 *   - 단, 폰트 사이즈는 토큰 그대로 (가독성)
 *
 * 분 단위: 5분 snap. initialMinute는 가장 가까운 5분으로 반올림.
 * 시 휠 (1~12) + 오전/오후 휠은 독립적으로 동작.
 * onConfirm 시 12시간제 → 24시간제 변환 (parent는 hour24 받음).
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { Button, Text } from './ui';
import { Colors, Radii, useResponsive, type TypographyVariant, type ColorToken } from '../theme';

export interface TimePickerSheetProps {
  visible: boolean;
  initialHour: number;
  initialMinute: number;
  title?: string;
  /** parent 검증용 (휠 자체는 제약 X — onConfirm 후 검증) */
  minDate?: Date;
  maxDate?: Date;
  onClose: () => void;
  onConfirm: (hour: number, minute: number) => void;
}

const VISIBLE_ROWS = 7;
const PAD_ROWS = Math.floor(VISIBLE_ROWS / 2); // 3

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5,...,55
const PERIODS = ['오전', '오후'] as const;

// 24시간제 → 12시간제 변환
function to12h(hour24: number): { hour12: number; isPM: boolean } {
  const isPM = hour24 >= 12;
  const mod = hour24 % 12;
  const hour12 = mod === 0 ? 12 : mod;
  return { hour12, isPM };
}

// 12시간제 → 24시간제 변환
function to24h(hour12: number, isPM: boolean): number {
  return (hour12 % 12) + (isPM ? 12 : 0);
}

function snapMinute(m: number): number {
  return Math.min(55, Math.max(0, Math.round(m / 5) * 5));
}

// ── 휠 한 칼럼 ────────────────────────────────────────────
interface WheelColumnProps<T extends string | number> {
  items: readonly T[];
  selectedIndex: number;
  onChange: (index: number) => void;
  itemHeight: number;
  width: number;
}

function WheelColumn<T extends string | number>({
  items,
  selectedIndex,
  onChange,
  itemHeight,
  width,
}: WheelColumnProps<T>) {
  const ref = useRef<ScrollView>(null);
  const wheelHeight = itemHeight * VISIBLE_ROWS;
  const padHeight = itemHeight * PAD_ROWS;

  // 외부 selectedIndex 변경 시 스크롤 sync
  useEffect(() => {
    ref.current?.scrollTo({ y: selectedIndex * itemHeight, animated: false });
  }, [selectedIndex, itemHeight]);

  const handleEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.y / itemHeight);
    const clamped = Math.max(0, Math.min(items.length - 1, idx));
    if (clamped !== selectedIndex) onChange(clamped);
  };

  return (
    <ScrollView
      ref={ref}
      style={{ width, height: wheelHeight }}
      contentContainerStyle={{ paddingVertical: padHeight }}
      showsVerticalScrollIndicator={false}
      snapToInterval={itemHeight}
      decelerationRate="fast"
      onMomentumScrollEnd={handleEnd}
      nestedScrollEnabled
    >
      {items.map((item, i) => {
        const dist = Math.abs(i - selectedIndex);
        const label = typeof item === 'number' ? String(item).padStart(2, '0') : item;
        let fontSize = 14;
        let color = 'rgba(126, 128, 129, 0.50)';
        let fontWeight: '500' | '700' = '500';

        if (dist === 0) {
          fontSize = 24;
          fontWeight = '700';
          color = Colors.textPrimary;
        } else if (dist === 1) {
          fontSize = 18;
          color = '#7E8081';
        } else if (dist === 2) {
          fontSize = 16;
          color = 'rgba(126, 128, 129, 0.80)';
        }

        return (
          <View key={`${String(item)}-${i}`} style={[styles.cell, { height: itemHeight }]}>
            <Text
              style={{
                fontFamily: 'Inter',
                fontSize,
                fontWeight,
                color,
                textAlign: 'center',
                letterSpacing: dist === 0 ? -0.48 : 0,
              }}
              allowFontScaling={false}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

// ── 메인 ───────────────────────────────────────────────────
export function TimePickerSheet({
  visible,
  initialHour,
  initialMinute,
  title = '다시 만날 시간을 설정해주세요.',
  onClose,
  onConfirm,
}: TimePickerSheetProps) {
  const { wp, hp } = useResponsive();

  // ── 피그마 수치 → 반응형 스케일 ──
  const ITEM_HEIGHT = hp(36);
  const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
  const PAD_HEIGHT = ITEM_HEIGHT * PAD_ROWS;

  const hourW = wp(40);
  const colonW = wp(10);
  const minuteW = wp(40);
  const gapW = wp(20);
  const periodW = wp(48);

  // 12시간제 + 오전/오후 독립 state (initialHour 는 24시간제 → 변환)
  const initial = to12h(initialHour);
  const [hour12, setHour12] = useState(initial.hour12);
  const [isPM, setIsPM] = useState(initial.isPM);
  const [minute, setMinute] = useState(snapMinute(initialMinute));

  useEffect(() => {
    if (visible) {
      const next = to12h(initialHour);
      setHour12(next.hour12);
      setIsPM(next.isPM);
      setMinute(snapMinute(initialMinute));
    }
  }, [visible, initialHour, initialMinute]);

  const periodIdx = isPM ? 1 : 0;
  const handlePeriodChange = (idx: number) => {
    setIsPM(idx === 1);
  };

  const handleConfirm = () => {
    onConfirm(to24h(hour12, isPM), minute);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          {
            paddingVertical: hp(32),
            paddingHorizontal: wp(17),
            gap: hp(34),
          },
        ]}
      >
        <Text variant="titleLargeMid" style={styles.sheetTitle}>
          {title}
        </Text>

        {/* picker — 가운데 정렬, 위에 selection pill + colon overlay */}
        <View style={[styles.wheelWrap, { height: WHEEL_HEIGHT }]}>
          {/* 선택 pill (270x36) */}
          <View
            pointerEvents="none"
            style={[
              styles.selectionPill,
              { top: PAD_HEIGHT + (ITEM_HEIGHT - hp(36)) / 2, height: hp(36), width: wp(270) },
            ]}
          />

          <View style={styles.wheelRow}>
            {/* 좌측 여백 (오른쪽 gap + am/pm 너비만큼)을 둬서 시:분이 중앙에 오도록 맞춤 */}
            <View style={{ width: gapW + periodW }} pointerEvents="none" />

            {/* 시 + ":" + 분 (left group) — 시는 1~12 */}
            <WheelColumn
              items={HOURS}
              selectedIndex={HOURS.indexOf(hour12)}
              onChange={(i) => setHour12(HOURS[i])}
              itemHeight={ITEM_HEIGHT}
              width={hourW}
            />

            {/* gap 5 */}
            <View style={{ width: wp(5) }} />

            {/* 중앙 행에만 ":" 표시 (inline) */}
            <View style={{ width: colonW, height: WHEEL_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
              <Text variant="displayLarge" color="textPrimary" align="center">
                :
              </Text>
            </View>

            {/* gap 5 */}
            <View style={{ width: wp(5) }} />

            <WheelColumn
              items={MINUTES}
              selectedIndex={MINUTES.indexOf(minute)}
              onChange={(i) => setMinute(MINUTES[i])}
              itemHeight={ITEM_HEIGHT}
              width={minuteW}
            />

            {/* gap 30 → 오전/오후 */}
            <View style={{ width: gapW }} />
            <WheelColumn
              items={PERIODS}
              selectedIndex={periodIdx}
              onChange={handlePeriodChange}
              itemHeight={ITEM_HEIGHT}
              width={periodW}
            />
          </View>
        </View>

        <Button
          variant="primary"
          size="lg"
          label="완료"
          onPress={handleConfirm}
          style={styles.confirmButton}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.backdrop,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radii.lg,
    borderTopRightRadius: Radii.lg,
    alignItems: 'center',
  },
  sheetTitle: {
    alignSelf: 'stretch',
  },
  wheelWrap: {
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  selectionPill: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: Colors.lightGray200,
    borderRadius: 28,
  },
  wheelRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },

  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButton: {
    alignSelf: 'stretch',
  },
});
