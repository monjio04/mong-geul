import React, { useEffect } from 'react';
import { LogBox, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import RootNavigator from './src/navigation/RootNavigator';
import DebugPanel from './src/__dev__/DebugPanel';
import { initNotifications } from './src/notifications/scheduler';

// Expo Go는 SDK 53부터 푸시 알림(remote)을 지원하지 않음.
// 우리는 로컬 알림(시간 예약)만 사용하므로 이 경고는 무시해도 안전.
// 실제 빌드(EAS Build / development build)에서는 이 경고가 뜨지 않음.
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'expo-notifications: iOS Push notifications',
]);

export default function App() {
  useEffect(() => {
    // 앱 시작 시 알림 핸들러 + Android 채널(HIGH importance) 셋업
    // Doze 모드 우회를 위해 반드시 필요
    initNotifications().catch((e) =>
      console.error('[App] initNotifications 실패:', e),
    );
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
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
