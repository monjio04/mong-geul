import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';

import OnboardingNavigator from './OnboardingNavigator';
import HomeScreen from '../screens/HomeScreen';
import WorryTimeScreen from '../screens/WorryTimeScreen';
import MemoScreen from '../screens/MemoScreen';
import MemoCompleteScreen from '../screens/MemoCompleteScreen';
import SettingsScreen from '../screens/SettingsScreen';
import NicknameChangeScreen from '../screens/NicknameChangeScreen';
import CopywriteScreen from '../screens/CopywriteScreen';
import NotWorryTimeSheet from '../screens/NotWorryTimeSheet';
import DelayPickerScreen from '../screens/DelayPickerScreen';
import DelayConfirmSheet from '../screens/DelayConfirmSheet';
import DelaySetSheet from '../screens/DelaySetSheet';
import RewardScreen from '../screens/RewardScreen';
import WorryCheckInSheet from '../screens/WorryCheckInSheet';
import OnboardingGuideScreen from '../screens/OnboardingGuideScreen';
import WorryTimeEntryScreen from '../screens/WorryTimeEntryScreen';
import FlowerBloomScreen from '../screens/FlowerBloomScreen';
import SplashScreen from '../screens/SplashScreen';
import { isOnboardingDone, initSchema } from '../storage/storage';

const Stack = createNativeStackNavigator<RootStackParamList>();

// 스플래시 최소 표시 시간 (ms) — 캐릭터 인사 모션이 자연스럽게 보이도록 약 4초
const SPLASH_MIN_MS = 4000;

export default function RootNavigator() {
  const [initialRoute, setInitialRoute] = useState<'Onboarding' | 'Home' | null>(null);
  const [splashMinPassed, setSplashMinPassed] = useState(false);

  useEffect(() => {
    (async () => {
      await initSchema();
      const done = await isOnboardingDone();
      setInitialRoute(done ? 'Home' : 'Onboarding');
    })();
    // 초기화가 빨라도 최소 SPLASH_MIN_MS 동안 스플래시 유지
    const t = setTimeout(() => setSplashMinPassed(true), SPLASH_MIN_MS);
    return () => clearTimeout(t);
  }, []);

  // 초기화 미완료 또는 최소 표시 시간 전 → 스플래시 (피그마 804:807)
  if (!initialRoute || !splashMinPassed) return <SplashScreen />;

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen
        name="WorryTimeEntry"
        component={WorryTimeEntryScreen}
        options={{ animation: 'fade', gestureEnabled: false }}
      />
      <Stack.Screen
        name="WorryTime"
        component={WorryTimeScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="Memo" component={MemoScreen} />
      <Stack.Screen
        name="MemoComplete"
        component={MemoCompleteScreen}
        options={{ animation: 'fade', gestureEnabled: false }}
      />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="NicknameChange" component={NicknameChangeScreen} />
      <Stack.Screen name="Copywrite" component={CopywriteScreen} />
      <Stack.Screen
        name="NotWorryTime"
        component={NotWorryTimeSheet}
        options={{ presentation: 'transparentModal', animation: 'fade' }}
      />
      <Stack.Screen
        name="DelayPicker"
        component={DelayPickerScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="DelayConfirm"
        component={DelayConfirmSheet}
        options={{ presentation: 'transparentModal', animation: 'fade' }}
      />
      <Stack.Screen
        name="DelaySet"
        component={DelaySetSheet}
        options={{ presentation: 'transparentModal', animation: 'fade' }}
      />
      <Stack.Screen
        name="Reward"
        component={RewardScreen}
        options={{ animation: 'fade', gestureEnabled: false }}
      />
      <Stack.Screen
        name="WorryCheckIn"
        component={WorryCheckInSheet}
        options={{
          presentation: 'transparentModal',
          animation: 'fade',
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="OnboardingGuide"
        component={OnboardingGuideScreen}
        options={{
          presentation: 'transparentModal',
          animation: 'fade',
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="FlowerBloom"
        component={FlowerBloomScreen}
        options={{
          presentation: 'transparentModal',
          animation: 'fade',
          gestureEnabled: false,
        }}
      />
    </Stack.Navigator>
  );
}
