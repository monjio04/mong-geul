import React, { useEffect } from 'react';
import { LogBox, View } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import RootNavigator from './src/navigation/RootNavigator';
import DebugPanel from './src/__dev__/DebugPanel';
import { initNotifications, NOTIF_ACTION } from './src/notifications/scheduler';
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
