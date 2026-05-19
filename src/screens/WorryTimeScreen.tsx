/**
 * 걱정 타임 화면 (placeholder + 완료 처리)
 *
 * 현재는 디자인 placeholder. 추후 피그마에 맞춰 타이머 + BGM + 메모 슬라이드 UI 추가 예정.
 *
 * 완료 동작:
 *  - 정규 활성 (active/inProgress) → 꽃
 *  - 앞당기기 (advanced) → 새싹
 *  - 미루기 후 (isDelayed) → 새싹
 * → completeTimer() 호출 → 사이클 종료 → 홈으로 reset → 홈은 자동으로 inactive 표시
 */

import React, { useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { getUserProfile } from '../storage/storage';
import { completeTimer } from '../timer/timerService';
import { Button, Text } from '../components/ui';
import { Colors, Spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'WorryTime'>;

export default function WorryTimeScreen({ navigation }: Props) {
  const [submitting, setSubmitting] = useState(false);

  const handleComplete = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const profile = await getUserProfile();
      if (!profile) {
        navigation.goBack();
        return;
      }

      // 완료 처리 — isDelayed/isAdvanced 플래그에 따라 꽃/새싹 자동 결정
      const result = await completeTimer(profile.worryTime);

      // 홈으로 reset → 홈이 다시 마운트되면서 isLocked=true 인식 → inactive 화면 표시
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });

      // TODO: 결과 모달 (꽃/새싹 + 일주일 돌아보기 트리거 시 안내)
      console.log('[WorryTime] 완료:', result);
    } catch (e) {
      Alert.alert('오류', '완료 처리 중 문제가 생겼어요.');
      console.error('[WorryTime] complete error:', e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text variant="titleMedium">걱정 타임</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.body}>
        <Text variant="heading" align="center" style={styles.title}>
          걱정 타임 화면
        </Text>
        <Text
          variant="sm"
          color="textSecondary"
          align="center"
          style={styles.subtitle}
        >
          타이머 + BGM + 메모 슬라이드{'\n'}
          (디자인 연결 예정)
        </Text>

        <View style={styles.spacer} />

        <Button
          variant="primary"
          size="lg"
          label={submitting ? '처리 중...' : '걱정 타임 완료'}
          onPress={handleComplete}
          disabled={submitting}
          style={styles.completeButton}
        />

        <Text
          variant="xs"
          color="textHint"
          align="center"
          style={styles.hint}
        >
          완료를 누르면 오늘 사이클이 마무리되고{'\n'}
          꽃밭에 기록이 남아요.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },

  // 헤더
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxl, // 20
  },
  headerBack: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 바디
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxxl, // 24
  },
  title: {
    marginBottom: Spacing.xs, // 8
  },
  subtitle: {
    marginBottom: Spacing.xxxxxl, // 40
  },

  spacer: { height: Spacing.xxxxxl }, // 40

  completeButton: {
    minWidth: 200,
    paddingHorizontal: Spacing.xxxxxl, // 40
    marginBottom: Spacing.xl, // 16
  },

  hint: {
    lineHeight: 18,
  },
});
