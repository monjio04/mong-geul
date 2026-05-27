import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ExitIcon from '../../../assets/icons/exit.svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { BottomButton, Text } from '../../components/ui';
import { ProgressBar } from '../../components/ProgressBar';
import { OnboardingHead } from '../../components/OnboardingHead';
import { TimePickerSheet } from '../../components/TimePickerSheet';
import { Colors, Radii, useResponsive } from '../../theme';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingTime'>;

function formatTimeOnly(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  const mm = String(minutes).padStart(2, '0');
  const hh = String(h12).padStart(2, '0');
  return `${hh} : ${mm}`;
}

function getAmPm(date: Date): string {
  return date.getHours() < 12 ? '오전' : '오후';
}

export default function OnboardingTimeScreen({ route, navigation }: Props) {
  const { nickname, recommendedHour, recommendedMinute } = route.params;

  const initialDate = new Date();
  initialDate.setHours(recommendedHour, recommendedMinute, 0, 0);

  const [selectedTime, setSelectedTime] = useState<Date>(initialDate);
  const [showPicker, setShowPicker] = useState(false);
  const insets = useSafeAreaInsets();
  const { wp, hp } = useResponsive();

  // 피그마 exit y=65 → SafeAreaView inset 뺀 값
  const backBtnTop = Math.max(0, hp(65) - insets.top);

  const handleNext = () => {
    navigation.navigate('OnboardingPermission', {
      nickname,
      worryHour: selectedTime.getHours(),
      worryMinute: selectedTime.getMinutes(),
    });
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
      <View style={[styles.progressWrap, { paddingTop: hp(29), paddingHorizontal: wp(20), marginBottom: hp(9) }]}>
        <ProgressBar current={3} total={4} />
      </View>

      {/* 제목 */}
      <OnboardingHead
        title={`${nickname}님을 위한\n걱정타임을 찾았어요.`}
        style={[styles.headWrap, { paddingHorizontal: wp(20), marginBottom: hp(31) }]}
      />

      {/* 집중 시간 + 시작 시간 */}
      <View style={[styles.infoRow, { paddingHorizontal: wp(24), gap: hp(17), marginBottom: hp(33) }]}>
        <View style={styles.infoItem}>
          <Text style={styles.infoEmoji}>⏳</Text>
          <Text variant="titleBold">
            집중 시간:{' '}
            <Text variant="titleBold" color="mainGreen">20분</Text>
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoEmoji}>⏰</Text>
          <Text variant="titleBold">시작 시간</Text>
        </View>
      </View>

      {/* 시간 표시 (탭하면 picker 열림) */}
      <TouchableOpacity
        style={[styles.timePill, { width: wp(232), height: hp(57), borderRadius: 14 }]}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.8}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: wp(18) }}>
          <Text variant="headingMid">{formatTimeOnly(selectedTime)}</Text>
          <Text variant="headingMid">{getAmPm(selectedTime)}</Text>
        </View>
      </TouchableOpacity>

      <TimePickerSheet
        visible={showPicker}
        title="시작 시간을 선택해 주세요."
        initialHour={selectedTime.getHours()}
        initialMinute={selectedTime.getMinutes()}
        onClose={() => setShowPicker(false)}
        onConfirm={(hour, minute) => {
          const newDate = new Date(selectedTime);
          newDate.setHours(hour, minute, 0, 0);
          setSelectedTime(newDate);
          setShowPicker(false);
        }}
      />

      {/* Spacer — timePill과 팁 사이 빈 공간을 자동으로 채워
          팁이 button 위 27dp에 정확히 위치하도록 */}
      <View style={{ flex: 1 }} />

      {/* 팁 영역 */}
      <View style={[styles.tipsWrap, { paddingHorizontal: wp(24), marginBottom: hp(83) }]}>
        <View style={[styles.tipsHeader, { marginBottom: hp(4), gap: wp(4) }]}>
          <Text style={styles.tipsEmoji}>💡</Text>
          <Text variant="bodyBold">걱정타임 설정 팁</Text>
        </View>
        <Text variant="sm" color="darkGray" style={styles.tipItem}>
          1. 온전히 집중할 수 있는 시간이 좋아요
        </Text>
        <Text variant="sm" color="darkGray" style={styles.tipItem}>
          2. 언제든 바꿀 수 있으니 편하게 골라 주세요
        </Text>
        <Text variant="sm" color="darkGray" style={styles.tipItem}>
          3. 자기 직전은 피하는 것을 추천해요
        </Text>
      </View>

      {/* 하단 버튼 — figma 677:768 bottom-button (네비바 위로 띄움) */}
      <BottomButton label="다음" onPress={handleNext} />
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
  headWrap: {},
  infoRow: {
    flexDirection: 'column',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoEmoji: { fontSize: 18, width: 22, textAlign: 'center' },

  // timePill
  timePill: {
    alignSelf: 'center',
    backgroundColor: Colors.lightGray200,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tipsWrap: {
    gap: 3,
    alignSelf: 'stretch',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipsEmoji: { fontSize: 15 },
  tipItem: { lineHeight: 20 },

});
