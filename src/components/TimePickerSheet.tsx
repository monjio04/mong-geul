/**
 * 공유 시간 picker 컴포넌트 — 피그마 483:1408 timepicker
 *
 * 사용처:
 *  - SettingsScreen 시작 시간 변경 (제약 없음)
 *  - DelayConfirmSheet, DelaySetSheet 미루기 시간 선택 (minDate/maxDate는 parent에서 검증)
 *
 * 피그마 사양 (483:1408):
 *   - Sheet: bg white, rounded-tl/tr 16, px 17 py 32, gap 34
 *   - Wheel block (483:1351): col gap 10, items-center, w 312, h 251
 *   - Title (501:604): col gap 5, items-start; "시작 시간을 선택해 주세요." 18/500 black -0.36
 *   - Wheel row (483:1353): gap 30, items-center
 *     · Inner row (483:1354): gap 5 [hour][:][min], items-center
 *     · ":" (483:1363) 20 black
 *     · Hour/min column: gap 9, items-start, p-px — 4단계 그라데이션
 *       선택 20 black / dist1 18 #7e8081 / dist2 16 rgba(126,128,129,0.8) / dist3 14 rgba(126,128,129,0.5)
 *     · AM/PM (483:1372): col gap 10, h 86, items-start — 2단계
 *       선택 20 black / 비선택 18 #d9d9d9
 *   - Selection pill (483:1349): absolute, w 270 h 36 rounded 28, lightGray200
 *   - Button (483:1375): bg mainGreen, px 148 py 19, rounded 16, w 324, "완료" 15/600 white -0.3
 *
 * 모든 figma 값은 절대 dp (폰트/패딩 동일). paddingBottom 만 safe-area inset 추가 (gesture bar 안전).
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
import { Colors, Radii } from '../theme';

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
        // figma 사양 — 폰트 사이즈 절대 dp (스케일 X, 다른 화면 폰트와 일관)
        let fontSize = 14;
        let color: string = 'rgba(126, 128, 129, 0.50)';
        const fontWeight: '500' = '500'; // figma: 모든 글자 Inter Medium

        if (colorMode === 'period') {
          // 오전/오후 — selected 20 black / unselected 18 #d9d9d9
          if (dist === 0) {
            fontSize = 20;
            color = '#000000';
          } else {
            fontSize = 18;
            color = '#d9d9d9';
          }
        } else {
          // 시/분 — 4단계 그라데이션 (figma 사양)
          if (dist === 0) {
            fontSize = 20;
            color = '#000000';
          } else if (dist === 1) {
            fontSize = 18;
            color = '#7e8081';
          } else if (dist === 2) {
            fontSize = 16;
            color = 'rgba(126, 128, 129, 0.8)';
          }
          // dist >= 3: 14 / rgba(126,128,129,0.5) (default)
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
  const insets = useSafeAreaInsets();

  // ── 피그마 483:1408 사양 — 절대 dp (반응형 스케일 X) ──
  const ITEM_HEIGHT = 36;                                  // figma h:251 / 7 ≈ 36
  const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
  const PAD_HEIGHT = ITEM_HEIGHT * PAD_ROWS;

  // 컬럼 너비: 20px Inter Medium "12"/"오후" 글자 폭 기준
  const hourW = 22;
  const minuteW = 22;
  const periodW = 38;
  const innerGap = 5;   // figma 483:1354 — 시 / : / 분 사이
  const outerGap = 30;  // figma 483:1353 — [시:분] ↔ 오전/오후

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
            paddingTop: 32,
            // figma 32 + safe-area bottom inset → 갤럭시 gesture bar 위로 버튼 띄움
            paddingBottom: 32 + insets.bottom,
            paddingHorizontal: 17,
            gap: 34,
          },
        ]}
      >
        {/* content group: title + wheel (figma 483:1351 — col, gap 10, items-center, w-312) */}
        <View style={[styles.contentGroup, { gap: 10 }]}>
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
          {/* 선택 pill — figma 483:1349 w 270 h 36 rounded 28 */}
          <View
            pointerEvents="none"
            style={[
              styles.selectionPill,
              { top: PAD_HEIGHT, height: 36, width: 270 },
            ]}
          />

          {/* figma 483:1353 — flat row, marginLeft 로 명시적 spacing 적용 (gap 호환성 회피) */}
          <View style={styles.wheelRow}>
            <View style={{ width: hourW }}>
              <WheelColumn
                items={HOURS}
                selectedIndex={HOURS.indexOf(hour12)}
                onChange={(i) => setHour12(HOURS[i])}
                itemHeight={ITEM_HEIGHT}
                width={hourW}
              />
            </View>

            {/* 중앙 행에만 ":" 표시 — figma 483:1363: 20px text-black */}
            <View style={{ height: WHEEL_HEIGHT, justifyContent: 'center', alignItems: 'center', marginLeft: innerGap }}>
              <Text
                allowFontScaling={false}
                style={{ fontSize: 20, fontWeight: '500', color: '#000', letterSpacing: -0.4 }}
              >
                :
              </Text>
            </View>

            <View style={{ width: minuteW, marginLeft: innerGap }}>
              <WheelColumn
                items={MINUTES}
                selectedIndex={MINUTES.indexOf(minute)}
                onChange={(i) => setMinute(MINUTES[i])}
                itemHeight={ITEM_HEIGHT}
                width={minuteW}
              />
            </View>

            {/* figma 483:1372 — 오전/오후 (color mode period: black/#d9d9d9) */}
            <View style={{ width: periodW, marginLeft: outerGap }}>
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
  // figma 483:1353 — wheel row: 시 | : | 분 | (gap 30) | 오전/오후
  wheelRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
  },

  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButton: {
    alignSelf: 'stretch',
  },
});
