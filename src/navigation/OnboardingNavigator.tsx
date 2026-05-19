import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from './types';

import OnboardingWelcomeScreen from '../screens/onboarding/OnboardingWelcomeScreen';
import OnboardingNicknameScreen from '../screens/onboarding/OnboardingNicknameScreen';
import OnboardingSurveyScreen from '../screens/onboarding/OnboardingSurveyScreen';
import OnboardingTimeScreen from '../screens/onboarding/OnboardingTimeScreen';
import OnboardingPermissionScreen from '../screens/onboarding/OnboardingPermissionScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <Stack.Screen name="OnboardingWelcome" component={OnboardingWelcomeScreen} />
      <Stack.Screen name="OnboardingNickname" component={OnboardingNicknameScreen} />
      <Stack.Screen name="OnboardingSurvey" component={OnboardingSurveyScreen} />
      <Stack.Screen name="OnboardingTime" component={OnboardingTimeScreen} />
      <Stack.Screen name="OnboardingPermission" component={OnboardingPermissionScreen} />
    </Stack.Navigator>
  );
}
