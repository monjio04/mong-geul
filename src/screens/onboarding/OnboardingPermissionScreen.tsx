import React, { useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ExitIcon from '../../../assets/icons/exit.svg';
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
import { OnboardingHead } from '../../components/OnboardingHead';
import { Colors, useResponsive } from '../../theme';

const BELL_IMAGE = require('../../../assets/images/onboarding_bell.png');

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingPermission'>;

export default function OnboardingPermissionScreen({ route, navigation }: Props) {
  const { nickname, worryHour, worryMinute } = route.params;
  const [loading, setLoading] = useState(false);
  const rootNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { wp, hp } = useResponsive();

  // 피그마 exit y=65 → SafeAreaView inset 뺀 값
  const backBtnTop = Math.max(0, hp(65) - insets.top);

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
      // 홈으로 reset + 그 위에 가이드 모달 진입 (4 슬라이드)
      rootNav.reset({
        index: 1,
        routes: [{ name: 'Home' }, { name: 'OnboardingGuide' }],
      });
    } catch (e) {
      console.error('[OnboardingPermission] 오류:', e);
      // 오류가 나도 홈으로 진입 (권한 거부 등은 홈에서 배너로 안내)
      // 홈으로 reset + 그 위에 가이드 모달 진입 (4 슬라이드)
      rootNav.reset({
        index: 1,
        routes: [{ name: 'Home' }, { name: 'OnboardingGuide' }],
      });
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
        <ExitIcon width={24} height={24} />
      </TouchableOpacity>

      {/* 프로그레스 */}
      <View style={[styles.progressWrap, { paddingTop: hp(29), paddingHorizontal: wp(20), marginBottom: hp(6) }]}>
        <ProgressBar current={4} total={4} />
      </View>

      {/* 제목 */}
      <OnboardingHead
        title={'걱정타임에\n알림을 보내드릴게요.'}
        subtitle="걱정이 쌓이지 않도록 매일 털어놓아보아요"
        style={{ paddingHorizontal: wp(20) }}
      />

      {/* 벨 이미지 - 피그마 기준 y=311 절대 좌표 배치 */}
      <View style={[styles.imageWrap, { top: hp(311), width: wp(301), height: hp(301) }]}>
        <Image source={BELL_IMAGE} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
      </View>

      {/* 시작하기 버튼 (loading 시 스피너) */}
      <View style={[styles.buttonWrap, { bottom: hp(42) }]}>
        {loading ? (
          <View style={[styles.button, styles.loadingButton, { width: wp(326) }]}>
            <ActivityIndicator color={Colors.white} />
          </View>
        ) : (
          <Button
            variant="primary"
            size="lg"
            label="시작하기"
            onPress={handleStart}
            style={{ width: wp(326) }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },

  // 피그마 exit y=65 — paddingTop은 동적 계산
  backBtn: {
    paddingLeft: 20,
    alignSelf: 'flex-start',
  },
  progressWrap: {},
  imageWrap: {
    position: 'absolute',
    alignSelf: 'center',
  },

  // 하단 버튼 wrap
  buttonWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
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
