import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { saveUserProfile } from '../../storage/storage';
import { scheduleCycle } from '../../notifications/scheduler';
import type { UserProfile } from '../../storage/types';
import { Button, Text } from '../../components/ui';
import { Colors, Spacing } from '../../theme';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingGuide'>;

export default function OnboardingGuideScreen({ navigation, route }: Props) {
  const { nickname, worryHour, worryMinute } = route.params;

  const handleStart = async () => {
    const profile: UserProfile = {
      nickname,
      worryTime: { hour: worryHour, minute: worryMinute },
      focusMinutes: 20,
      bgm: 'classic',
      notificationsEnabled: true,
      audioEnabled: true,
    };
    await saveUserProfile(profile);
    await scheduleCycle({ hour: worryHour, minute: worryMinute });
    // 루트 네비게이터에서 Home으로 이동하도록 최상위 navigate 사용
    (navigation as any).reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  return (
    <View style={styles.container}>
      <Text variant="display" style={styles.title}>이렇게 사용해요 📖</Text>

      <View style={styles.guideItem}>
        <Text style={styles.guideIcon}>⏰</Text>
        <Text variant="bodyMedium" color="textHint" style={styles.guideText}>
          걱정 타임 알림이 오면 1시간 30분 안에 시작해요.{'\n'}
          바로 못 할 것 같으면 미룰 수 있어요.
        </Text>
      </View>

      <View style={styles.guideItem}>
        <Text style={styles.guideIcon}>📓</Text>
        <Text variant="bodyMedium" color="textHint" style={styles.guideText}>
          정해진 시간에만 집중해서 걱정을 적어요.{'\n'}
          나머지 시간은 오롯이 당신의 것이에요.
        </Text>
      </View>

      <View style={styles.guideItem}>
        <Text style={styles.guideIcon}>🌸</Text>
        <Text variant="bodyMedium" color="textHint" style={styles.guideText}>
          걱정 타임을 마치면 꽃이 피어요.{'\n'}
          꽃밭이 채워지는 걸 함께 지켜봐요.
        </Text>
      </View>

      <View style={styles.guideItem}>
        <Text style={styles.guideIcon}>📝</Text>
        <Text variant="bodyMedium" color="textHint" style={styles.guideText}>
          걱정이 생길 때마다 메모를 남겨두세요.{'\n'}
          걱정 타임에 꺼내볼 수 있어요.
        </Text>
      </View>

      <Button
        variant="primary"
        size="lg"
        label="시작하기"
        onPress={handleStart}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    padding: Spacing.xxxl, // 24
    paddingTop: 60,
  },
  title: {
    marginBottom: Spacing.xxxxl, // 32
  },
  guideItem: {
    flexDirection: 'row',
    marginBottom: Spacing.xxxl, // 24
    alignItems: 'flex-start',
  },
  guideIcon: {
    fontSize: 24,
    marginRight: Spacing.lg, // 14
    marginTop: 2,
  },
  guideText: {
    flex: 1,
    lineHeight: 22,
  },
  button: {
    marginTop: 'auto',
  },
});
