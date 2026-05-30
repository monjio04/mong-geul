import React, { useEffect } from 'react';
import { LogBox, Linking, View } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NfcManager, { NfcEvents } from 'react-native-nfc-manager';
import RootNavigator from './src/navigation/RootNavigator';
import DebugPanel from './src/__dev__/DebugPanel';
import { initNotifications, NOTIF_ACTION } from './src/notifications/scheduler';
import { getTimerState, getUserProfile } from './src/storage/storage';
import { resolveState, hasTodayCycleEnded } from './src/timer/stateMachine';
import { handleNfcTagEntry } from './src/nfc/nfcEntry';
import { GlobalToastHost } from './src/components/GlobalToast';
import type { RootStackParamList } from './src/navigation/types';

// NFC deep link URL — AndroidManifest 의 intent filter 와 매칭
const NFC_DEEP_LINK_PREFIX = 'https://worrytime.app/start';

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
  // 커스텀 폰트 로드 — 캐릭터 말풍선 손글씨 (MemomentKkukkukk)
  //   파일: assets/fonts/MemomentKkukkukk.ttf (key 와 파일명 일치 필요)
  const [fontsLoaded] = useFonts({
    MemomentKkukkukk: require('./assets/fonts/MemomentKkukkukk.ttf'),
  });

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

  // ─── NFC 통합 ──────────────────────────────────────────
  // Expo Go 에선 NFC native module 없으므로 isSupported() 가 false → no-op
  // Development build (Android) 에서만 실제 작동
  useEffect(() => {
    let mounted = true;

    const initNfc = async () => {
      try {
        const supported = await NfcManager.isSupported();
        if (!supported || !mounted) return;
        await NfcManager.start();
        NfcManager.setEventListener(NfcEvents.DiscoverTag, () => {
          handleNfcTagEntry().catch((e) => console.warn('[NFC] entry error:', e));
          // 재등록 — 다음 태그 인식 위해
          NfcManager.unregisterTagEvent().catch(() => {});
          NfcManager.registerTagEvent().catch(() => {});
        });
        await NfcManager.registerTagEvent();
        if (__DEV__) console.log('[NFC] foreground listener ready');
      } catch (e) {
        // Expo Go / NFC 미지원 기기 — 조용히 skip
        if (__DEV__) console.log('[NFC] init skipped:', e instanceof Error ? e.message : e);
      }
    };
    initNfc();

    // Deep link (앱 종료/백그라운드에서 NFC 태그로 진입) handler
    const handleUrl = ({ url }: { url: string }) => {
      if (url.includes(NFC_DEEP_LINK_PREFIX)) {
        // navigationRef ready 대기
        const wait = () => {
          if (navigationRef.isReady()) {
            handleNfcTagEntry().catch((e) => console.warn('[NFC] deep link error:', e));
          } else {
            setTimeout(wait, 100);
          }
        };
        wait();
      }
    };
    const linkSub = Linking.addEventListener('url', handleUrl);
    // 앱 종료 상태에서 NFC 로 열린 경우 — initial URL 1회 처리
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    return () => {
      mounted = false;
      linkSub.remove();
      NfcManager.unregisterTagEvent().catch(() => {});
      NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
    };
  }, []);

  // [DEV ONLY] 이전에 seed 했던 4월 더미 꽃 record 일회성 정리
  //   - 이전 'dev:aprilSeeded:v11' 시드 코드 제거 + 이미 저장된 4월 30개 record 삭제
  //   - FLAG 로 한 번만 동작 (앱 재실행해도 재정리 안 함)
  useEffect(() => {
    if (!__DEV__) return;
    (async () => {
      const FLAG = 'dev:aprilSeedCleared:v1';
      const already = await AsyncStorage.getItem(FLAG);
      if (already) return;
      const year = new Date().getFullYear();
      const keys: string[] = [];
      for (let day = 1; day <= 30; day++) {
        keys.push(`record:${year}-04-${String(day).padStart(2, '0')}`);
      }
      await AsyncStorage.multiRemove(keys);
      // 이전 seed FLAG 도 정리 (남아 있어봐야 의미 없음)
      await AsyncStorage.removeItem('dev:aprilSeeded:v11');
      await AsyncStorage.setItem(FLAG, '1');
      console.log(`[DEV] cleared 30 april dummy flower records for ${year}-04`);
    })();
  }, []);

  // 폰트 로딩 완료 전엔 렌더 보류 (말풍선 손글씨 깜빡임 방지)
  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer ref={navigationRef}>
          <StatusBar style="auto" />
          <View style={{ flex: 1 }}>
            <RootNavigator />
            <DebugPanel />
            {/* 전역 토스트 (NFC delayed 상태 안내 등) */}
            <GlobalToastHost />
          </View>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
