import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { Button, Text } from '../../components/ui';
import { ProgressBar } from '../../components/ProgressBar';
import { Colors, Radii, Spacing } from '../../theme';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingTime'>;

function formatTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const isAM = hours < 12;
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  const mm = String(minutes).padStart(2, '0');
  const hh = String(h12).padStart(2, '0');
  return `${hh} : ${mm}   ${isAM ? '오전' : '오후'}`;
}

export default function OnboardingTimeScreen({ route, navigation }: Props) {
  const { nickname, recommendedHour, recommendedMinute } = route.params;

  const initialDate = new Date();
  initialDate.setHours(recommendedHour, recommendedMinute, 0, 0);

  const [selectedTime, setSelectedTime] = useState<Date>(initialDate);
  const [showPicker, setShowPicker] = useState(false);
  const insets = useSafeAreaInsets();
  // 피그마 exit y=65 → SafeAreaView inset 뺀 값
  const backBtnTop = Math.max(0, 65 - insets.top);

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
        <Ionicons name="arrow-back" size={24} color={Colors.darkText} />
      </TouchableOpacity>

      {/* 프로그레스 */}
      <View style={styles.progressWrap}>
        <ProgressBar current={3} total={4} />
      </View>

      {/* 제목 */}
      <View style={styles.headWrap}>
        <Text variant="display">{`${nickname}님을 위한\n걱정타임을 찾았어요.`}</Text>
      </View>

      {/* 집중 시간 + 시작 시간 */}
      <View style={styles.infoRow}>
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
        style={styles.timePill}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.8}
      >
        <Text variant="titleLargeMid">{formatTime(selectedTime)}</Text>
      </TouchableOpacity>

      {/* Android picker: 탭 시 다이얼로그 */}
      {showPicker && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowPicker(Platform.OS === 'ios');
            if (event.type === 'set' && date) {
              setSelectedTime(date);
            }
          }}
        />
      )}

      {/* iOS inline picker 확인 버튼 */}
      {Platform.OS === 'ios' && showPicker && (
        <TouchableOpacity style={styles.pickerDone} onPress={() => setShowPicker(false)}>
          <Text variant="bodyLarge" color="mainGreen">확인</Text>
        </TouchableOpacity>
      )}

      {/* Spacer — timePill과 팁 사이 빈 공간을 자동으로 채워
          팁이 button 위 27dp에 정확히 위치하도록 */}
      <View style={{ flex: 1 }} />

      {/* 팁 영역 */}
      <View style={styles.tipsWrap}>
        <View style={styles.tipsHeader}>
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

      {/* 하단 버튼 */}
      <Button
        variant="primary"
        size="lg"
        label="다음"
        onPress={handleNext}
        style={styles.button}
      />
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
  // 피그마 progress y=118 (exit_end=89, gap 29), head y=155 (progress_end=146, gap 9)
  progressWrap: {
    paddingTop: 29,
    paddingHorizontal: Spacing.xxl, // 20
    marginBottom: 9,
  },
  // 피그마 head h=97 (텍스트 2줄 ~66dp + 빈 공간 31dp가 head 영역 안에 포함됨)
  // RN에서 같은 시각 효과 — text 아래 빈 여백 31dp를 marginBottom으로 추가
  headWrap: {
    paddingHorizontal: 30,
    marginBottom: 31,
  },

  // 피그마 Frame 103: x=24, y=252, h=65 → end=317
  // start-time-setting y=350 → gap 33
  infoRow: {
    paddingHorizontal: Spacing.xxxl, // 24
    gap: 17,
    marginBottom: 33,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm, // 10
  },
  infoEmoji: { fontSize: 18, width: 22, textAlign: 'center' },

  // 피그마 start-time-setting: w=232, h=57
  // timePill ↔ 팁 사이 빈 공간은 위의 flex:1 spacer가 채움
  // (피그마 800dp 디자인의 182dp gap을 폰 height에 맞춰 자동 조정)
  timePill: {
    alignSelf: 'center',
    width: 232,
    height: 57,
    backgroundColor: Colors.lightGray200,
    borderRadius: 14, // 피그마 14.553 raw → 14
    alignItems: 'center',
    justifyContent: 'center',
  },

  // iOS picker done
  pickerDone: {
    alignSelf: 'flex-end',
    marginRight: Spacing.xxxl, // 24
    marginBottom: Spacing.xs, // 8
  },

  // 팁 — button 위 27dp에 위치 (피그마 Frame24_end y=675, button y=702 → gap 27)
  // flex 1 spacer가 위에서 빈 공간을 채우므로 tipsWrap은 자연 크기 (flex 0)
  tipsWrap: {
    paddingHorizontal: Spacing.xxxl, // 24
    gap: 3,
    alignSelf: 'stretch',
    marginBottom: 27,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs, // 4
    marginBottom: Spacing.xxs, // 4
  },
  tipsEmoji: { fontSize: 15 },
  tipItem: { lineHeight: 20 },

  // 피그마 bottom-button y=702 → marginBottom 42
  button: {
    marginHorizontal: 17,
    marginBottom: 42,
  },
});
