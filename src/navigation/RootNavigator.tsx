import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';

import OnboardingNavigator from './OnboardingNavigator';
import HomeScreen from '../screens/HomeScreen';
import WorryTimeScreen from '../screens/WorryTimeScreen';
import MemoScreen from '../screens/MemoScreen';
import SettingsScreen from '../screens/SettingsScreen';
import NicknameChangeScreen from '../screens/NicknameChangeScreen';
import CopywriteScreen from '../screens/CopywriteScreen';
import NotWorryTimeSheet from '../screens/NotWorryTimeSheet';
import DelayPickerScreen from '../screens/DelayPickerScreen';
import { isOnboardingDone, initSchema } from '../storage/storage';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const [initialRoute, setInitialRoute] = useState<'Onboarding' | 'Home' | null>(null);

  useEffect(() => {
    (async () => {
      await initSchema();
      const done = await isOnboardingDone();
      setInitialRoute(done ? 'Home' : 'Onboarding');
    })();
  }, []);

  if (!initialRoute) return null; // 스플래시 대체

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="WorryTime" component={WorryTimeScreen} />
      <Stack.Screen name="Memo" component={MemoScreen} />
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
    </Stack.Navigator>
  );
}
