/**
 * GlobalToast — 앱 전역 토스트
 *
 * 사용처: NFC 태그 시 사이클이 미루기 대기 상태(delayed)면 안내 메시지
 *   예: "오후 03:00 에 다시 만나요"
 *
 * 디자인: figma 615:1919 (TimePickerSheet 토스트와 동일 스타일)
 *   - bg #93a09a (darkGray), white text 14/500
 *   - w 283, padding 15h/10v, rounded 16
 *   - 화면 중앙 (top: ~50%)
 *
 * 패턴 (TimePickerSheet 의 toast 동일):
 *   - module-level listener — 어디서든 import 해서 호출 가능
 *   - <GlobalToastHost /> 를 App.tsx 최상위에 1번 마운트
 *   - emitGlobalToast(msg) 호출 → 토스트 표시 + 2.5s 후 자동 사라짐
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text as RNText } from 'react-native';
import { Colors } from '../theme';

// ─── 모듈 단위 emitter ─────────────────────────────────────

type Listener = (message: string | null) => void;
const listeners = new Set<Listener>();

/**
 * 토스트 메시지 표시 (어디서든 호출 가능).
 * 같은 시점에 여러 번 호출하면 마지막 메시지로 덮어쓰기.
 */
export function emitGlobalToast(message: string): void {
  for (const l of listeners) l(message);
}

// ─── Host 컴포넌트 — App 최상위에 1번 마운트 ────────────────

export function GlobalToastHost() {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const listener: Listener = (msg) => {
      setMessage(msg);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (msg !== null) {
        timerRef.current = setTimeout(() => setMessage(null), 2500);
      }
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!message) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.toast}>
        <RNText style={styles.text} allowFontScaling={false}>
          {message}
        </RNText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 전체 화면 덮는 안전 컨테이너 (pointerEvents: none — 하위 터치 X)
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    // 토스트가 화면 정중앙보다 살짝 위
    paddingBottom: '40%',
  },
  // figma 615:1919 — 283×~41 darkGray pill
  toast: {
    width: 283,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: Colors.darkGray, // #93a09a
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    letterSpacing: -0.28,
    lineHeight: 21, // 14 * 1.5
    textAlign: 'center',
  },
});
