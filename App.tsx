import React, { useEffect } from 'react';
import { LogBox, View } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RootNavigator from './src/navigation/RootNavigator';
import DebugPanel from './src/__dev__/DebugPanel';
import { initNotifications, NOTIF_ACTION } from './src/notifications/scheduler';
import { saveDayRecord } from './src/storage/storage';
import type { DayRecord, FlowerType } from './src/storage/types';
import type { RootStackParamList } from './src/navigation/types';

// Expo Go는 SDK 53부터 푸시 알림(remote)을 지원하지 않음.
// 우리는 로컬 알림(시간 예약)만 사용하므로 이 경고는 무시해도 안전.
LogBox.ignoreLogs([
  /expo-notifications:.*Push notifications/,
  /Use a development build instead of Expo Go/,
]);

// console.error로 출력되는 메시지는 LogBox.ignoreLogs로 안 막히고 ErrorOverlay에 뜸.
const __origError = console.error;
console.error = (...args: unknown[]) => {
  const first = typeof args[0] === 'string' ? args[0] : '';
  if (first.includes('expo-notifications:') && first.includes('Push notifications')) {
    return;
  }
  __origError(...args);
};

// Navigation ref — 알림 응답 핸들러에서 navigation 호출 위해 (컴포넌트 밖)
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * 알림 응답 처리 (액션 버튼 / 일반 탭)
 *  - DELAY: 홈 → DelayConfirm 모달
 *  - START_NOW: 홈 (걱정타임 active)
 *  - default (탭): 홈
 */
function handleNotificationResponse(response: Notifications.NotificationResponse) {
  if (!navigationRef.isReady()) return;
  const action = response.actionIdentifier;

  if (action === NOTIF_ACTION.DELAY) {
    navigationRef.navigate('Home');
    // Home 마운트 후 모달 push
    setTimeout(() => {
      if (navigationRef.isReady()) {
        navigationRef.navigate('DelayConfirm');
      }
    }, 150);
  } else if (action === NOTIF_ACTION.START_NOW) {
    navigationRef.navigate('Home');
  } else {
    // 기본 탭 (액션 버튼 X 또는 일반 탭) — 홈
    navigationRef.navigate('Home');
  }
}

export default function App() {
  useEffect(() => {
    // 알림 핸들러 + Android 채널 + 액션 카테고리 셋업
    initNotifications().catch((e) =>
      console.error('[App] initNotifications 실패:', e),
    );

    // 알림 응답 리스너 등록
    const sub = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    // 앱 종료 상태에서 알림 탭으로 열린 경우 — last response 1회 처리
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      // navigationRef ready 대기
      const wait = () => {
        if (navigationRef.isReady()) {
          handleNotificationResponse(response);
        } else {
          setTimeout(wait, 100);
        }
      };
      wait();
    });

    return () => sub.remove();
  }, []);

  // [DEV ONLY] 4월에 30개 더미 꽃 record seed (한 번만, idempotent)
  // - grid 분포 (6 cols × 5 rows = 30 cells) + cell 안 jitter → 균등 배치
  // - 색은 shuffle → 같은 색 인접 회피
  useEffect(() => {
    if (!__DEV__) return;
    (async () => {
      const FLAG = 'dev:aprilSeeded:v3';
      const already = await AsyncStorage.getItem(FLAG);
      if (already) return;
      const year = new Date().getFullYear();

      // 30개 색 배열 — 1~7 순환 (각 4~5개), 그 후 shuffle
      const colors: FlowerType[] = [];
      for (let i = 0; i < 30; i++) {
        colors.push((((i % 7) + 1) as FlowerType));
      }
      // Fisher-Yates shuffle
      for (let i = colors.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [colors[i], colors[j]] = [colors[j], colors[i]];
      }

      // grid: 6 cols × 5 rows (총 30 cells)
      // x range 0.08~0.92 (cell width ~0.168), y range 0.62~0.84 (cell height ~0.055)
      const COLS = 6;
      const ROWS = 5;
      const X_START = 0.08;
      const X_END = 0.92;
      const Y_START = 0.62;
      const Y_END = 0.84;
      const cellW = (X_END - X_START) / (COLS - 1);
      const cellH = (Y_END - Y_START) / (ROWS - 1);

      for (let day = 1; day <= 30; day++) {
        const idx = day - 1;
        const col = idx % COLS;
        const row = Math.floor(idx / COLS);
        const xBase = X_START + col * cellW;
        const yBase = Y_START + row * cellH;
        // cell 안 jitter (cell의 30% 정도 범위)
        const x = xBase + (Math.random() - 0.5) * cellW * 0.6;
        const y = yBase + (Math.random() - 0.5) * cellH * 0.6;

        const dd = String(day).padStart(2, '0');
        const dateStr = `${year}-04-${dd}`;
        const record: DayRecord = {
          status: 'flower',
          flowerType: colors[idx],
          position: { x, y },
          completedAt: new Date(`${dateStr}T20:00:00`).toISOString(),
          isDelayed: false,
          isAdvanced: false,
        };
        await saveDayRecord(dateStr, record);
      }
      await AsyncStorage.setItem(FLAG, '1');
      console.log(`[DEV] seeded 30 flower records for ${year}-04 (grid+shuffle)`);
    })();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer ref={navigationRef}>
          <StatusBar style="auto" />
          <View style={{ flex: 1 }}>
            <RootNavigator />
            <DebugPanel />
          </View>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
