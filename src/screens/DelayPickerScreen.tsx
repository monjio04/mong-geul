/**
 * 미루기 시간 picker 화면
 *
 * 진입 조건: 걱정 타임 활성 상태에서 사용자가 "미루기" 버튼을 누름
 *
 * 정책:
 * - 사이클당 1회 제한 (canDelay에서 검증)
 * - 시간 picker 범위:
 *     하한 = 현재 + 30분
 *     상한 = 익일 04:00
 * - 04:00 설정자는 미루기 자체 비활성 (canDelay false → 진입 불가)
 * - 하한이 04:00을 넘으면 picker 비활성 + "오늘은 미루기 불가" 안내
 *
 * 동작:
 * - 사용자 시각 확정 → applyDelay(delayedUntil) 호출
 *   → 기존 2차 알림/잠금 트리거 취소, 재알림 + 미루기 잠금 예약
 * - 홈으로 복귀 (걱정 타임 잠금 해제는 재알림 시점에 자동 처리)
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { applyDelay } from '../timer/timerService';
import { getDelayPickerRange, canDelay } from '../timer/worryTimeWindow';
import { getUserProfile, getTimerState } from '../storage/storage';
import { Button, Text } from '../components/ui';
import { Colors, Radii, Spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DelayPicker'>;

export default function DelayPickerScreen({ navigation }: Props) {
  const [now] = useState(() => new Date());
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const { min, max } = useMemo(() => getDelayPickerRange(now), [now]);

  const [selected, setSelected] = useState<Date>(min);
  const [showAndroidPicker, setShowAndroidPicker] = useState(Platform.OS === 'android');

  // 진입 시 미루기 가능 여부 검증
  useEffect(() => {
    (async () => {
      const profile = await getUserProfile();
      const state = await getTimerState();
      if (!profile) {
        setAllowed(false);
        return;
      }
      const ok = canDelay({
        worryTime: profile.worryTime,
        isDelayed: state.isDelayed,
        isAdvanced: state.isAdvanced,
        now,
      });
      setAllowed(ok);
    })();
  }, [now]);

  const handleConfirm = async () => {
    if (selected < min) {
      Alert.alert('알림', '지금으로부터 30분 이후로 선택해주세요.');
      return;
    }
    if (selected > max) {
      Alert.alert('알림', '새벽 04:00까지만 미룰 수 있어요.');
      return;
    }
    await applyDelay(selected);
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  const handleCancel = () => navigation.goBack();

  // 검증 중
  if (allowed === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text variant="body" color="textSecondary">잠시만요...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 미루기 불가 케이스
  if (!allowed) {
    const isPastDeadline = min >= max;
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text variant="heading" align="center" style={styles.unavailableTitle}>
            오늘은 미루기 어려워요
          </Text>
          <Text
            variant="body"
            color="textSecondary"
            align="center"
            style={styles.unavailableBody}
          >
            {isPastDeadline
              ? '새벽 04:00 전까지만 미룰 수 있어요.\n지금 시작하거나 내일 다시 만나요.'
              : '이번 사이클에는 이미 다른 선택을 하셨어요.'}
          </Text>
          <Button
            variant="primary"
            size="md"
            label="닫기"
            onPress={handleCancel}
            style={styles.closeButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text variant="bodyLarge" color="textSecondary">취소</Text>
        </TouchableOpacity>
        <Text variant="title">언제로 미룰까요?</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.info}>
        <Text variant="xs" color="textSecondary" style={styles.infoLabel}>
          선택 가능 범위
        </Text>
        <Text variant="body" color="textHint">
          {formatTime(min)} ~ {formatTime(max)}
        </Text>
      </View>

      <View style={styles.pickerArea}>
        {Platform.OS === 'ios' ? (
          <DateTimePicker
            value={selected}
            mode="time"
            display="spinner"
            minuteInterval={5}
            onChange={(_, date) => date && setSelected(date)}
          />
        ) : (
          <>
            <View style={styles.androidValue}>
              <Text style={styles.androidValueText}>{formatTime(selected)}</Text>
            </View>
            <Button
              variant="ghost"
              size="md"
              label="시간 변경"
              onPress={() => setShowAndroidPicker(true)}
              style={styles.changeButton}
              textStyle={{ color: Colors.mainGreen }}
            />
            {showAndroidPicker && (
              <DateTimePicker
                value={selected}
                mode="time"
                display="default"
                minuteInterval={5}
                onChange={(event, date) => {
                  setShowAndroidPicker(false);
                  if (event.type === 'set' && date) {
                    const normalized = adjustToValidWindow(date, min, max);
                    setSelected(normalized);
                  }
                }}
              />
            )}
          </>
        )}
      </View>

      <Button
        variant="primary"
        size="lg"
        label="이 시간으로 미루기"
        onPress={handleConfirm}
        style={styles.confirm}
      />
    </SafeAreaView>
  );
}

// ─── 헬퍼 ──────────────────────────────────────────────

function formatTime(date: Date): string {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${m}/${d} ${h}:${min}`;
}

/**
 * 안드로이드 picker가 시/분만 반환하는 경우, 오늘 또는 내일로 보정
 * - 선택한 시각이 현재보다 이르면 → 내일로
 */
function adjustToValidWindow(picked: Date, min: Date, max: Date): Date {
  const candidate = new Date(min);
  candidate.setHours(picked.getHours(), picked.getMinutes(), 0, 0);

  if (candidate < min) {
    candidate.setDate(candidate.getDate() + 1);
  }
  if (candidate > max) {
    return max;
  }
  return candidate;
}

// ─── 스타일 ───────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxl, // 20
    paddingVertical: Spacing.lg, // 14
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  // 정보 영역
  info: {
    padding: Spacing.xxl, // 20
    alignItems: 'center',
  },
  infoLabel: {
    marginBottom: 6,
  },

  // picker
  pickerArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  androidValue: {
    paddingHorizontal: Spacing.xxxxl, // 32
    paddingVertical: Spacing.xxxl, // 24
    borderRadius: Radii.md,
    backgroundColor: Colors.lightGray200,
    marginBottom: Spacing.xl, // 16
  },
  // androidValueText는 28px(picker 강조)으로 토큰 외 사이즈
  // — 시간 자체를 크게 보여주는 강조 텍스트라 fontSize 인라인 유지
  androidValueText: {
    fontSize: 28,
    fontWeight: '600',
    color: Colors.textPrimary,
    letterSpacing: -0.56,
  },
  changeButton: {
    paddingHorizontal: Spacing.xxxl, // 24
    borderWidth: 1,
    borderColor: Colors.mainGreen,
    borderRadius: Radii.sm,
  },

  // 확정 버튼
  confirm: {
    margin: Spacing.xxl, // 20
    alignSelf: 'stretch',
  },

  // 미루기 불가 안내
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxxxl, // 32
  },
  unavailableTitle: {
    marginBottom: Spacing.xl, // 16
  },
  unavailableBody: {
    lineHeight: 22,
    marginBottom: Spacing.xxxxl, // 32
  },
  closeButton: {
    paddingHorizontal: Spacing.xxxxxl, // 40
  },
});
