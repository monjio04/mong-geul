import React, { useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList, RootStackParamList } from '../../navigation/types';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  requestNotificationPermission,
  requestExactAlarmPermission,
} from '../../notifications/permissions';
import { saveUserProfile } from '../../storage/storage';
import { scheduleCycle } from '../../notifications/scheduler';
import type { UserProfile } from '../../storage/types';
import { Button, Text } from '../../components/ui';
import { ProgressBar } from '../../components/ProgressBar';
import { Colors, Spacing } from '../../theme';

const BELL_IMAGE = require('../../../assets/images/onboarding_bell.png');

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingPermission'>;

export default function OnboardingPermissionScreen({ route, navigation }: Props) {
  const { nickname, worryHour, worryMinute } = route.params;
  const [loading, setLoading] = useState(false);
  const rootNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  // 피그마 exit y=65 → SafeAreaView inset 뺀 값
  const backBtnTop = Math.max(0, 65 - insets.top);

  const handleStart = async () => {
    setLoading(true);
    try {
      // 알림 권한 요청
      await requestNotificationPermission();
      await requestExactAlarmPermission();

      // 사용자 프로필 저장
      const profile: UserProfile = {
        nickname,
        worryTime: { hour: worryHour, minute: worryMinute },
        focusMinutes: 20,
        bgm: 'classic',
        notificationsEnabled: true,
        audioEnabled: true,
      };
      await saveUserProfile(profile);

      // 첫 알림 사이클 예약
      await scheduleCycle(profile.worryTime);

      // 홈으로 이동 (온보딩 완전 종료)
      rootNav.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (e) {
      console.error('[OnboardingPermission] 오류:', e);
      // 오류가 나도 홈으로 진입 (권한 거부 등은 홈에서 배너로 안내)
      rootNav.reset({ index: 0, routes: [{ name: 'Home' }] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 뒤로가기 — 피그마 y=65 동적 계산 */}
      <TouchableOpacity
        style={[styles.backBtn, { paddingTop: backBtnTop }]}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-back" size={24} color={Colors.darkText} />
      </TouchableOpacity>

      {/* 프로그레스 */}
      <View style={styles.progressWrap}>
        <ProgressBar current={4} total={4} />
      </View>

      {/* 제목 */}
      <View style={styles.headWrap}>
        <Text variant="display">{'걱정타임에\n알림을 보내드릴게요.'}</Text>
        <Text variant="bodyMedium" color="darkGray">
          걱정이 쌓이지 않도록 매일 털어놓아보아요
        </Text>
      </View>

      {/* 벨 이미지 */}
      <View style={styles.imageWrap}>
        <Image source={BELL_IMAGE} style={styles.bellImage} resizeMode="contain" />
      </View>

      {/* 시작하기 버튼 (loading 시 스피너) */}
      {loading ? (
        <View style={[styles.button, styles.loadingButton]}>
          <ActivityIndicator color={Colors.white} />
        </View>
      ) : (
        <Button
          variant="primary"
          size="lg"
          label="시작하기"
          onPress={handleStart}
          style={styles.button}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },

  // 피그마 exit y=65 — paddingTop은 useSafeAreaInsets로 동적 계산
  backBtn: {
    paddingLeft: Spacing.xxl, // 20
    alignSelf: 'flex-start',
  },
  // 피그마 progress y=118 (exit_end=89, gap 29), head y=150 (progress_end=146, gap 4)
  progressWrap: {
    paddingTop: 29,
    paddingHorizontal: Spacing.xxl, // 20
    marginBottom: Spacing.xxs, // 4
  },
  // 피그마 head h=97 (150→247), bell y=311 → gap 64
  headWrap: {
    paddingHorizontal: 30,
    gap: Spacing.xs, // 8
    marginBottom: 64,
  },

  imageWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bellImage: { width: 301, height: 301 },

  // 피그마 bottom-button y=702 → marginBottom 42
  button: {
    marginHorizontal: 17,
    marginBottom: 42,
  },
  // loading 상태일 때 Button 자리에 같은 시각적 박스로 스피너 표시
  loadingButton: {
    height: 56,
    backgroundColor: Colors.mainGreen,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
