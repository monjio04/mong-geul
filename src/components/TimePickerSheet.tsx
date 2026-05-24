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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Text } from './ui';
import { Colors, Radii, useResponsive, type TypographyVariant, type ColorToken } from '../theme';

export interface TimePickerSheetProps {
  visible: boolean;
  initialHour: number;
  initialMinute: number;
  /** 제목 — figma default "시작 시간을 선택해 주세요." */
  title?: string;
  /** 부제 (figma 사양 — title 아래 작은 회색 텍스트) */
  subtitle?: string;
  /** parent 검증용 (휠 자체는 제약 X — onConfirm 후 검증) */
  minDate?: Date;
  maxDate?: Date;
  onClose: () => void;
  /**
   * 완료 콜백.
   *   - void 반환 → 검증 통과 (parent 가 picker 닫기 처리)
   *   - string 반환 → 검증 실패 → picker 안에 toast 표시 + picker 유지
   *     (예: "새벽 4시 전까지만 설정할 수 있어요.")
   */
  onConfirm: (
    hour: number,
    minute: number,
  ) => string | void | Promise<string | void>;
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
type WheelColorMode = 'number' | 'period';

interface WheelColumnProps<T extends string | number> {
  items: readonly T[];
  selectedIndex: number;
  onChange: (index: number) => void;
  itemHeight: number;
  width: number;
  /** 색/사이즈 그라데이션 모드 — number(시/분: 4단계) vs period(오전/오후: 2색) */
  colorMode?: WheelColorMode;
}

function WheelColumn<T extends string | number>({
  items,
  selectedIndex,
  onChange,
  itemHeight,
  width,
  colorMode = 'number',
}: WheelColumnProps<T>) {
  const ref = useRef<ScrollView>(null);
  const { wp } = useResponsive();
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
        // figma 360dp 기준 fontSize → wp() 로 폰 비례 스케일
        let fontSize = wp(14);
        let color: string = 'rgba(126, 128, 129, 0.50)';
        const fontWeight: '500' = '500'; // figma: 모든 글자 Inter Medium

        if (colorMode === 'period') {
          // 오전/오후 — selected 20 black / unselected 18 #d9d9d9
          if (dist === 0) {
            fontSize = wp(20);
            color = '#000000';
          } else {
            fontSize = wp(18);
            color = '#d9d9d9';
          }
        } else {
          // 시/분 — 4단계 그라데이션 (figma 사양)
          if (dist === 0) {
            fontSize = wp(20);
            color = '#000000';
          } else if (dist === 1) {
            fontSize = wp(18);
            color = '#7e8081';
          } else if (dist === 2) {
            fontSize = wp(16);
            color = 'rgba(126, 128, 129, 0.8)';
          }
          // dist >= 3: wp(14) / rgba(126,128,129,0.5) (default)
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
  title = '시작 시간을 선택해 주세요.',
  subtitle,
  onClose,
  onConfirm,
}: TimePickerSheetProps) {
  const { wp, hp } = useResponsive();
  const insets = useSafeAreaInsets();

  // ── 피그마 수치 → 반응형 스케일 ──
  const ITEM_HEIGHT = hp(36);
  const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
  const PAD_HEIGHT = ITEM_HEIGHT * PAD_ROWS;

  // figma 483:1355/1364 — 컬럼은 글자 크기만큼만 좁게 (items-start + w-full text-center)
  // 20px Inter Medium "12" ≈ 22dp, "오후" ≈ 38dp 기준
  const hourW = wp(26);
  const colonW = wp(10);
  const minuteW = wp(26);
  const gapW = wp(30); // figma 483:1353 — wheel row 내 am/pm 앞 gap
  const periodW = wp(38);

  // 12시간제 + 오전/오후 독립 state (initialHour 는 24시간제 → 변환)
  const initial = to12h(initialHour);
  const [hour12, setHour12] = useState(initial.hour12);
  const [isPM, setIsPM] = useState(initial.isPM);
  const [minute, setMinute] = useState(snapMinute(initialMinute));
  // 검증 실패 시 picker 안에 표시할 toast 메시지 (figma 615:1919)
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      const next = to12h(initialHour);
      setHour12(next.hour12);
      setIsPM(next.isPM);
      setMinute(snapMinute(initialMinute));
      // 새로 열릴 때 이전 toast 잔재 클리어
      setToastMessage(null);
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    }
  }, [visible, initialHour, initialMinute]);

  // 언마운트 시 timer 정리
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 2500);
  };

  const periodIdx = isPM ? 1 : 0;
  const handlePeriodChange = (idx: number) => {
    setIsPM(idx === 1);
  };

  const handleConfirm = async () => {
    const result = await onConfirm(to24h(hour12, isPM), minute);
    // parent 가 string 반환 → 검증 실패 → toast 표시 + picker 유지
    if (typeof result === 'string') {
      showToast(result);
    }
    // void/undefined → 검증 통과, parent 가 picker 닫음 (setVisible(false))
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* picker 와 toast 를 같은 bottom 컨테이너에 묶음 — toast 가 자동으로 picker 위로 쌓임 */}
      <View style={styles.bottomStack} pointerEvents="box-none">
        {/* Toast — figma 615:1919 (picker 위) */}
        {toastMessage && (
          <View style={styles.toast} pointerEvents="none">
            <Text style={styles.toastText} allowFontScaling={false}>
              {toastMessage}
            </Text>
          </View>
        )}

        <View
          style={[
            styles.sheet,
          {
            paddingTop: hp(32),
            // figma 32 + safe-area bottom inset → 갤럭시 gesture bar 위로 버튼 띄움
            paddingBottom: hp(32) + insets.bottom,
            paddingHorizontal: wp(17),
            gap: hp(34),
          },
        ]}
      >
        {/* content group: title + wheel (figma 483:1351 — col, gap 10, items-center, w-312) */}
        <View style={[styles.contentGroup, { gap: hp(10) }]}>
          {/* title + subtitle (figma 501:604 — col, gap 5, w-full, items-start) */}
          <View style={styles.titleWrap}>
            <Text style={styles.title}>
              {title}
            </Text>
            {!!subtitle && (
              <Text style={styles.subtitle}>
                {subtitle}
              </Text>
            )}
          </View>

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
            {/* 시 + ":" + 분 (left group) — 시는 1~12 */}
            <WheelColumn
              items={HOURS}
              selectedIndex={HOURS.indexOf(hour12)}
              onChange={(i) => setHour12(HOURS[i])}
              itemHeight={ITEM_HEIGHT}
              width={hourW}
            />

            {/* 중앙 행에만 ":" 표시 (inline) — figma: 20px text-black */}
            <View style={{ width: colonW, height: WHEEL_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
              <Text
                allowFontScaling={false}
                style={{ fontSize: wp(20), fontWeight: '500', color: '#000', letterSpacing: -0.4 }}
              >
                :
              </Text>
            </View>

            <WheelColumn
              items={MINUTES}
              selectedIndex={MINUTES.indexOf(minute)}
              onChange={(i) => setMinute(MINUTES[i])}
              itemHeight={ITEM_HEIGHT}
              width={minuteW}
            />

            {/* gap 30 → 오전/오후 (color mode period: black/#d9d9d9) */}
            <View style={{ width: wp(10) }} />
            <WheelColumn
              items={PERIODS}
              selectedIndex={periodIdx}
              onChange={handlePeriodChange}
              itemHeight={ITEM_HEIGHT}
              width={periodW}
              colorMode="period"
            />
          </View>
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.backdrop,
  },
  // bottom-anchored stack — toast 가 picker 위로 자동 쌓임 (위치 하드코딩 불필요)
  bottomStack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  sheet: {
    alignSelf: 'stretch', // bottomStack 안에서 가로 100%
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radii.lg,
    borderTopRightRadius: Radii.lg,
    alignItems: 'center',
  },
  // Toast — figma 615:1919 (picker 위)
  // bg #93a09a (darkGray), w 283, padding 15h/10v, rounded 16
  // text 14px Medium white, leading 1.5, tracking -0.28
  toast: {
    marginBottom: 15, // picker 와의 gap (figma 사양)
    width: 283,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: Colors.darkGray, // #93a09a
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    letterSpacing: -0.28,
    lineHeight: 21, // 14 * 1.5
    textAlign: 'center',
  },
  // figma 483:1351 — title + wheel을 한 그룹으로 묶기 (col, gap 10, items-center)
  contentGroup: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  // title + subtitle column (gap 5)
  titleWrap: {
    alignSelf: 'stretch',
    gap: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: '500',
    color: '#000',
    letterSpacing: -0.36,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#a0a0a0',
    letterSpacing: -0.26,
    lineHeight: 19.5, // 13 * 1.5
  },
  wheelWrap: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center', // wheelRow를 가로 가운데 정렬 (figma 매칭)
  },
  selectionPill: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: Colors.lightGray200,
    borderRadius: 28,
  },
  wheelRow: {
    flexDirection: 'row',
    alignSelf: 'center',
  },

  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButton: {
    alignSelf: 'stretch',
  },
});
