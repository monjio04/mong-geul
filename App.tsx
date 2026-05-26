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
import { saveDayRecord, getTimerState, getUserProfile } from './src/storage/storage';
import { pickFlowerPosition } from './src/timer/flowerCycle';
import { resolveState, hasTodayCycleEnded } from './src/timer/stateMachine';
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
 *
 * 모든 액션에서 먼저 현재 사이클 state 를 확인:
 *   - locked / completed (걱정타임 종료) → WorryTimeEnded 모달
 *   - 그 외 → action 별 분기
 *     · DELAY    → DelayConfirm
 *     · START_NOW → Home
 *     · default  → Home
 *
 * 이전 알림을 늦게 탭한 케이스 (잠금 후 미루기 누름 등) 도 자연스럽게 처리됨.
 */
async function handleNotificationResponse(response: Notifications.NotificationResponse) {
  if (!navigationRef.isReady()) return;
  const action = response.actionIdentifier;

  // 현재 상태 조회 (action 분기 판단용)
  let currentState: ReturnType<typeof resolveState> | null = null;
  let cycleEnded = false;
  try {
    const profile = await getUserProfile();
    if (profile) {
      const timerState = await getTimerState();
      const now = new Date();
      currentState = resolveState(timerState, now, profile.worryTime);
      cycleEnded = hasTodayCycleEnded(currentState, now, profile.worryTime);
      console.log(
        '[handleNotificationResponse] action=', action,
        'state=', currentState,
        'ended=', cycleEnded,
      );
    }
  } catch (e) {
    console.warn('[handleNotificationResponse] state 확인 실패:', e);
  }

  // 1) 오늘 사이클 종료 (locked/completed/missed) → WorryTimeEnded 모달
  if (cycleEnded) {
    navigationRef.navigate('Home', { showWorryEnded: true });
    return;
  }

  // 2) action 별 분기
  if (action === NOTIF_ACTION.DELAY) {
    // DELAY 는 active 상태에서만 valid — 그 외 (idle/inProgress 등) 는 stale → 그냥 홈
    if (currentState === 'active') {
      navigationRef.navigate('Home');
      setTimeout(() => {
        if (navigationRef.isReady()) {
          navigationRef.navigate('DelayConfirm');
        }
      }, 150);
    } else {
      navigationRef.navigate('Home');
    }
  } else if (action === NOTIF_ACTION.START_NOW) {
    navigationRef.navigate('Home');
  } else {
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

  // [DEV ONLY] 4월에 30개 더미 record seed (한 번만, idempotent)
  // - 위치: production 과 동일하게 pickFlowerPosition(date) — figma 615:1549 의 32 슬롯
  //   풀에서 month seed 기반 shuffle 로 day 별 unique slot 할당
  // - 색: 1~7 순환 후 shuffle → 같은 색 인접 회피
  // - 모두 status='flower' (단순화)
  useEffect(() => {
    if (!__DEV__) return;
    (async () => {
      // v11: figma 615:1549 정확 32 슬롯 풀 + production 동일 로직 (shuffle)
      const FLAG = 'dev:aprilSeeded:v11';
      const already = await AsyncStorage.getItem(FLAG);
      if (already) return;
      const year = new Date().getFullYear();

      // 30개 색 배열 — 1~7 순환 (각 4~5개), 그 후 shuffle
      const colors: FlowerType[] = [];
      for (let i = 0; i < 30; i++) {
        colors.push((((i % 7) + 1) as FlowerType));
      }
      for (let i = colors.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [colors[i], colors[j]] = [colors[j], colors[i]];
      }

      for (let day = 1; day <= 30; day++) {
        const dd = String(day).padStart(2, '0');
        const dateStr = `${year}-04-${dd}`;
        // production 과 동일 — month seed 기반 shuffle 에서 day 별 unique slot
        const position = pickFlowerPosition(new Date(year, 3, day)); // month 0-indexed (3=4월)
        const record: DayRecord = {
          status: 'flower',
          flowerType: colors[day - 1],
          position,
          completedAt: new Date(`${dateStr}T20:00:00`).toISOString(),
          isDelayed: false,
          isAdvanced: false,
        };
        await saveDayRecord(dateStr, record);
      }
      await AsyncStorage.setItem(FLAG, '1');
      console.log(`[DEV] seeded 30 flower records for ${year}-04 (figma 32 slots, shuffled)`);
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
