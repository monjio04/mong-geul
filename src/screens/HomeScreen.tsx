/**
 * 홈 화면
 *
 * 레이아웃 (피그마 360x800 기준, 반응형 처리):
 *  - 헤더: 로고 (좌) | < YYYY.MM > (중앙, chevron) | 설정 (우)
 *  - 배경: 일러스트 이미지 (항상 표시)
 *  - 중앙: 말풍선(활성시) + 캐릭터 Lottie — 한 컨테이너로 묶음
 *  - 하단: 카운트다운/필사하기 + 메인 CTA
 *
 * 상태별 버튼:
 *  - 활성 (active/inProgress/advanced):
 *      왼쪽 작은 = "필사하기" → Copywrite
 *      오른쪽 큰 = "걱정 정리하기" → WorryTime
 *  - 비활성 (idle/delayed/locked/completed):
 *      왼쪽 작은 = 카운트다운 (탭 가능) → NotWorryTime 시트 (앞당기기 안내)
 *      오른쪽 큰 = "걱정 맡겨두기" → MEMO 화면
 *
 * 반응형: flex + percentage 위주. 캐릭터·말풍선은 화면 너비 비율 기반.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { getUserProfile, getTimerState } from '../storage/storage';
import type { UserProfile, WorkerState } from '../storage/types';
import { resolveState } from '../timer/stateMachine';
import { getNextPrimaryAlarm } from '../timer/worryTimeWindow';
import { MainButton } from '../components/MainButton';

const BG_IMAGE = require('../../assets/images/background.png');

const COLORS = {
  white: '#ffffff',
  sky: '#BFE6F5',           // 배경 이미지 상단 하늘색 (베이스 fill용)
  brand: '#16af5d',
  brandDimmed: '#9DC9AA',
  lightGray: '#f2f2f2',
  darkGray: '#93a09a',
  textBlack: '#000000',
  textGray: '#7a7a7a',
  logoBg: '#d9d9d9',
};

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [appState, setAppState] = useState<WorkerState>('idle');
  const [countdown, setCountdown] = useState<string>('00:00');
  const [now, setNow] = useState<Date>(new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const refresh = async () => {
        const currentNow = new Date();
        if (cancelled) return;

        const p = await getUserProfile();
        if (!p) {
          (navigation as any).reset({ index: 0, routes: [{ name: 'Onboarding' }] });
          return;
        }
        const timerState = await getTimerState();
        const state = resolveState(timerState, currentNow, p.worryTime);

        if (cancelled) return;
        setProfile(p);
        setAppState(state);
        setNow(currentNow);
        setCountdown(computeCountdown(state, currentNow, p, timerState));
      };

      refresh();
      intervalRef.current = setInterval(refresh, 30 * 1000);

      return () => {
        cancelled = true;
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }, [navigation]),
  );

  if (!profile) {
    return <SafeAreaView style={styles.screen} edges={['top']} />;
  }

  const isActive =
    appState === 'active' ||
    appState === 'inProgress' ||
    appState === 'advanced';

  const headerDate = formatYearMonth(now);

  // TODO: 월별 꽃밭 네비게이션 — 현재 표시 월 state 추가 예정
  const handlePrevMonth = () => {
    console.log('[Home] prev month — 추후 꽃밭 네비게이션 연결');
  };
  const handleNextMonth = () => {
    console.log('[Home] next month — 추후 꽃밭 네비게이션 연결');
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* 1) 하늘색 베이스 (이미지 위쪽 잘릴 때 노출됨) */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.sky }]} />
      {/* 2) 배경 이미지 — 하단 앵커, 비율 유지 */}
      <Image source={BG_IMAGE} style={styles.bgImage} resizeMode="cover" />

      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>로고</Text>
        </View>
        <View style={styles.headerCenter}>
          <TouchableOpacity
            onPress={handlePrevMonth}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 4 }}
          >
            <Ionicons name="chevron-back" size={18} color={COLORS.textBlack} />
          </TouchableOpacity>
          <Text style={styles.headerDate}>{headerDate}</Text>
          <TouchableOpacity
            onPress={handleNextMonth}
            hitSlop={{ top: 10, bottom: 10, left: 4, right: 10 }}
          >
            <Ionicons name="chevron-forward" size={18} color={COLORS.textBlack} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => navigation.navigate('Settings')}
          accessibilityLabel="설정"
        >
          <Ionicons name="settings-outline" size={24} color={COLORS.textBlack} />
        </TouchableOpacity>
      </View>

      {/* 캐릭터 — 활성/비활성 모두 동일 위치 (bottom: '23%') */}
      <View style={styles.characterAnchor} pointerEvents="box-none">
        <LottieView
          source={require('../../assets/lottie/character_idle.json')}
          autoPlay
          loop
          style={styles.character}
          resizeMode="contain"
        />
      </View>

      {/* 말풍선 — 활성일 때만, 캐릭터 위에 절대 위치 */}
      {isActive && (
        <View style={styles.bubbleAnchor} pointerEvents="none">
          <View style={styles.speechBubble}>
            <Text style={styles.bubbleText}>
              지금은 <Text style={styles.bubbleHighlight}>걱정타임이에요!</Text>{'\n'}
              메모해둔 걱정을 정리하거나,{'\n'}
              걱정이 없다면 필사로 시작해보세요 🍃
            </Text>
          </View>
          <View style={styles.bubbleTail} />
        </View>
      )}

      {/* 하단 액션 영역 — 공용 MainButton 컴포넌트 */}
      <View style={styles.bottomBar}>
        <MainButton
          status={isActive ? 'worry-time' : 'idle'}
          remainingTime={countdown}
          onPressLeft={
            isActive
              ? () => navigation.navigate('Copywrite')   // 필사하기
              : () => navigation.navigate('NotWorryTime') // 카운트다운 박스 탭 — 앞당기기 안내
          }
          onPressRight={
            isActive
              ? () => navigation.navigate('WorryTime')   // 걱정 정리하기
              : () => navigation.navigate('Memo')        // 걱정 맡겨두기
          }
        />
      </View>
    </SafeAreaView>
  );
}

// ─── 카운트다운 ──────────────────────────────────────────

function computeCountdown(
  state: WorkerState,
  now: Date,
  profile: UserProfile,
  timerState: { startedAt: string | null; delayedUntil: string | null },
): string {
  if (state === 'inProgress' && timerState.startedAt) {
    const start = new Date(timerState.startedAt).getTime();
    const end = start + profile.focusMinutes * 60 * 1000;
    const remainingMs = Math.max(0, end - now.getTime());
    return formatMmSs(Math.floor(remainingMs / 1000));
  }
  if (state === 'delayed' && timerState.delayedUntil) {
    const target = new Date(timerState.delayedUntil).getTime();
    return formatDiff(now.getTime(), target);
  }
  if (state === 'active' || state === 'advanced') return '00:00';
  const next = getNextPrimaryAlarm(now, profile.worryTime);
  return formatDiff(now.getTime(), next.getTime());
}

function formatMmSs(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDiff(fromMs: number, toMs: number): string {
  const diffSec = Math.max(0, Math.floor((toMs - fromMs) / 1000));
  const h = Math.floor(diffSec / 3600);
  const m = Math.floor((diffSec % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

function formatYearMonth(d: Date): string {
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ─── 스타일 (반응형: flex + percentage) ─────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.white },

  // 헤더
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  logo: {
    width: 40, height: 40, borderRadius: 8,
    backgroundColor: COLORS.logoBg,
    justifyContent: 'center', alignItems: 'center',
  },
  logoText: { fontSize: 12, color: COLORS.textBlack, letterSpacing: -0.24 },

  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerDate: {
    fontSize: 16, fontWeight: '600', color: COLORS.textBlack,
    letterSpacing: -0.32,
    minWidth: 80, textAlign: 'center',
  },

  settingsBtn: {
    width: 40, height: 40,
    justifyContent: 'center', alignItems: 'center',
  },

  // 배경 이미지 — 하단 앵커, 비율 유지
  // 화면 너비에 맞춰 800/360 비율로 그려짐, hills가 항상 화면 하단에 완전히 보임
  bgImage: {
    position: 'absolute',
    bottom: 0,
    left: 0, right: 0,
    width: '100%',
    aspectRatio: 360 / 800,
  },

  // 캐릭터 — 활성/비활성 모두 동일 위치
  // 풀밭 라인(약 화면 65% from top)에서 발이 살짝 묻히도록 23%
  characterAnchor: {
    position: 'absolute',
    bottom: '23%',
    left: 0, right: 0,
    alignItems: 'center',
  },

  // 말풍선 — 캐릭터 머리 위, 활성일 때만 표시
  // 캐릭터 height ≈ 화면 너비 × 60% × (207/196) ≈ 화면 너비 × 63%
  // S25(360x780): 캐릭터 height ≈ 227dp = 29% of screen height
  // → 말풍선 bottom = 23% (캐릭터 bottom) + 29% (캐릭터 height) ≈ 52%
  bubbleAnchor: {
    position: 'absolute',
    bottom: '52%',
    left: 0, right: 0,
    alignItems: 'center',
  },
  speechBubble: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 14,
    maxWidth: '85%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 4,
  },
  bubbleText: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textBlack,
    textAlign: 'center',
    letterSpacing: -0.26,
  },
  bubbleHighlight: {
    color: COLORS.brand,
    fontWeight: '700',
  },
  bubbleTail: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: COLORS.white,
  },

  // 캐릭터 (반응형: 화면 너비의 60%, 비율 유지)
  // 피그마 spec: 196x207 ≈ 1:1.056
  character: {
    width: '60%',
    aspectRatio: 196 / 207,
  },

  // 하단 액션 — MainButton 자체가 width=320 고정. 중앙 정렬.
  bottomBar: {
    position: 'absolute',
    bottom: 32,
    left: 0, right: 0,
    alignItems: 'center',
  },
});
