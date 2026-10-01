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
import { canDelay, isInDelayWindow, getCurrentCyclePrimary } from './src/timer/worryTimeWindow';
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
 * 우선순위 분기:
 *   1) cycleEnded (locked/completed/missed) → "오늘의 걱정타임이 끝났어요" 모달 (figma 613:594)
 *   2) inProgress / advanced (타이머 진행 중) → WorryTime 화면으로 복귀
 *   3) action 별 분기
 *      · DELAY    → 3중 검증 (active + canDelay + delayWindow) 통과 시 DelayConfirm
 *                  실패 시 → "오늘의 걱정타임이 끝났어요" 모달 (액션 유효 윈도우 종료)
 *      · START_NOW → active 일 때만 Home / 그 외 → "오늘의 걱정타임이 끝났어요" 모달
 *      · default  → Home
 *
 * NotWorryTime 모달 ("지금은 걱정타임이 아니에요!") 은 worryTime 이전에 앞당기기 진입할 때만 사용.
 * 알림 액션 검증 실패는 "유효 윈도우가 끝났다" 의미이므로 WorryEnded 모달이 맞음.
 *
 * 옛/stale 알림 늦게 탭한 케이스도 자연스럽게 처리됨.
 */
async function handleNotificationResponse(response: Notifications.NotificationResponse) {
  if (!navigationRef.isReady()) return;
  const action = response.actionIdentifier;

  // 현재 상태 조회 (action 분기 판단용)
  let currentState: ReturnType<typeof resolveState> | null = null;
  let cycleEnded = false;
  let delayAllowed = false;
  let delayWindowActive = false;
  try {
    const profile = await getUserProfile();
    if (profile) {
      const timerState = await getTimerState();
      const now = new Date();
      currentState = resolveState(timerState, now, profile.worryTime);
      cycleEnded = hasTodayCycleEnded(currentState, now, profile.worryTime);
      // 미루기 가능 여부 — 이미 미루기/앞당기기 사용 시 false → 옛 알림 stale action 차단
      delayAllowed = canDelay({
        worryTime: profile.worryTime,
        isDelayed: timerState.isDelayed,
        isAdvanced: timerState.isAdvanced,
        now,
      });
      // 미루기 액션 시간 윈도우 — [worryTime+30분, worryTime+90분]
      //   · 2차 알림 발화 시점부터 lock 시점까지의 1시간만 유효
      //   · 옛 알림 늦게 탭한 경우 윈도우 밖이면 stale 처리
      const primaryAlarm = getCurrentCyclePrimary(now, profile.worryTime);
      delayWindowActive = isInDelayWindow(now, primaryAlarm);
      console.log(
        '[handleNotificationResponse] action=', action,
        'state=', currentState,
        'ended=', cycleEnded,
        'delayAllowed=', delayAllowed,
        'delayWindowActive=', delayWindowActive,
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

  // 2) 타이머 진행 중 (inProgress/advanced) → WorryTime 화면으로 복귀
  //   · 이미 시작한 사용자에게 다시 미루기/시작 모달 띄우면 안 됨
  if (currentState === 'inProgress' || currentState === 'advanced') {
    navigationRef.navigate('Home');
    setTimeout(() => {
      if (navigationRef.isReady()) {
        navigationRef.navigate('WorryTime');
      }
    }, 150);
    return;
  }

  // 3) action 별 분기 — 검증 실패 시 "오늘의 걱정타임이 끝났어요" 모달 (figma 613:594)
  //    HomeScreen 의 route.params.showWorryEnded 가 true 면 마운트 시 모달 띄움.
  const showWorryEnded = () => {
    navigationRef.navigate('Home', { showWorryEnded: true });
  };

  if (action === NOTIF_ACTION.DELAY) {
    // DELAY 는 다음 3개 조건을 모두 만족할 때만 valid:
    //   1) currentState === 'active' — 사이클 안에 있어야 함
    //   2) delayAllowed — 미루기/앞당기기 미사용 (canDelay 정책)
    //   3) delayWindowActive — 2차 알림 발화 ~ lock 사이 (worryTime+30분 ~ worryTime+90분)
    // 셋 중 하나라도 false → 검증 실패 → "오늘의 걱정타임이 끝났어요" 모달
    if (currentState === 'active' && delayAllowed && delayWindowActive) {
      navigationRef.navigate('Home');
      setTimeout(() => {
        if (navigationRef.isReady()) {
          navigationRef.navigate('DelayConfirm');
        }
      }, 150);
    } else {
      showWorryEnded();
    }
  } else if (action === NOTIF_ACTION.START_NOW) {
    // START_NOW 는 active 상태일 때만 valid — 그 외엔 "오늘의 걱정타임이 끝났어요" 모달
    if (currentState === 'active') {
      navigationRef.navigate('Home');
    } else {
      showWorryEnded();
    }
  } else {
    // 본문 탭 (액션 버튼 X) — 그냥 홈으로
    navigationRef.navigate('Home');
  }
}

export default function App() {
  // 커스텀 폰트 로드 — key 는 src/theme/fonts.ts 의 Fonts 값과 일치해야 함
  const [fontsLoaded] = useFonts({
    'Pretendard-Regular': require('./assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-Medium': require('./assets/fonts/Pretendard-Medium.otf'),
    'Pretendard-SemiBold': require('./assets/fonts/Pretendard-SemiBold.otf'),
    'Pretendard-Bold': require('./assets/fonts/Pretendard-Bold.otf'),
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
