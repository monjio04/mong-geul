/**
 * GlobalToast — 앱 전역 토스트 (재사용)
 *
 * 두 가지 variant:
 *   - 'default' : 텍스트만 (figma 615:1919) — w 283, darkGray pill, 화면 중앙
 *       예: NFC delayed 안내 "오후 03:00 에 다시 만나요"
 *   - 'warning' : ! 아이콘 + 텍스트 (figma 818:906/930) — 콘텐츠 너비, darkGray pill
 *       예: "하루에 100개까지만 작성할 수 있어요."
 *
 * 공통 스타일: bg #93a09a (darkGray), white text 14/500/-0.28, rounded 16
 *
 * 패턴 (module-level emitter):
 *   - <GlobalToastHost /> 를 App.tsx 최상위에 1번 마운트
 *   - emitGlobalToast(msg) / emitGlobalToast(msg, 'warning') 어디서든 호출
 *   - 표시 후 2.5s 자동 사라짐
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text as RNText } from 'react-native';
import { Colors } from '../theme';
import WarningIcon from '../../assets/icons/warning.svg';

export type ToastVariant = 'default' | 'warning';

// ─── 모듈 단위 emitter ─────────────────────────────────────

interface ToastPayload {
  message: string;
  variant: ToastVariant;
}
type Listener = (payload: ToastPayload | null) => void;
const listeners = new Set<Listener>();

/**
 * 토스트 메시지 표시 (어디서든 호출 가능).
 * @param message 표시할 문구
 * @param variant 'default'(텍스트만) | 'warning'(! 아이콘 + 텍스트)
 */
export function emitGlobalToast(message: string, variant: ToastVariant = 'default'): void {
  for (const l of listeners) l({ message, variant });
}

// ─── Host 컴포넌트 — App 최상위에 1번 마운트 ────────────────

export function GlobalToastHost() {
  const [payload, setPayload] = useState<ToastPayload | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const listener: Listener = (p) => {
      setPayload(p);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (p !== null) {
        timerRef.current = setTimeout(() => setPayload(null), 2500);
      }
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!payload) return null;

  const isWarning = payload.variant === 'warning';

  return (
    <View
      style={[styles.container, isWarning && styles.containerBottom]}
      pointerEvents="none"
    >
      {isWarning ? (
        // figma 818:906/930 — ! 아이콘 + 텍스트, 콘텐츠 너비
        <View style={styles.warningToast}>
          <WarningIcon width={20} height={20} />
          <RNText style={styles.text} allowFontScaling={false}>
            {payload.message}
          </RNText>
        </View>
      ) : (
        // figma 615:1919 — 텍스트만, w 283
        <View style={styles.toast}>
          <RNText style={[styles.text, styles.textCenter]} allowFontScaling={false}>
            {payload.message}
          </RNText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // 전체 화면 덮는 안전 컨테이너 (pointerEvents: none — 하위 터치 X)
  //  default — 화면 중앙 위쪽 (paddingBottom 40% → vertical center 30%쯤)
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: '40%',
  },
  // warning — MainButton 바로 위 18dp 여백 (figma 615:1541)
  //   MainButton wrapper: bottom:0, height:136, pb:45 → 버튼 top from screen bottom = 126.5dp
  //   toast bottom edge = 126.5 + 18 = 144.5 → 145 (반올림)
  //   ※ RN 의 percentage padding 은 부모 width 기준이라 % 안 됨 → 절대 dp 사용
  containerBottom: {
    justifyContent: 'flex-end',
    paddingBottom: 145,
  },
  // figma 615:1919 — 283×~41 darkGray pill (텍스트 전용)
  toast: {
    width: 283,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: Colors.darkGray, // #93a09a
    alignItems: 'center',
    justifyContent: 'center',
  },
  // figma 818:906/930 — ! 아이콘 + 텍스트, gap 7, px 20 py 10, 콘텐츠 너비
  warningToast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: Colors.darkGray, // #93a09a
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    letterSpacing: -0.28,
    lineHeight: 21, // 14 * 1.5
  },
  textCenter: {
    textAlign: 'center',
  },
});
