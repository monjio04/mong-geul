/**
 * 홈 화면 — 피그마 메인화면-걱정타임 (active, 301:5437) / 걱정타임X (idle, 112:807)
 *
 * 레이아웃 (피그마 360×800 기준, 화면 비율로 반응형):
 *  - 헤더: 로고 (좌, x=20 y=59 40×40) | < YYYY.MM > (중앙, chevron) | 설정 (우, x=308 y=67)
 *  - 배경: background.png + sky base
 *  - 말풍선 (active 만): figma 메인 spec — center, top 234, lightGray100 pill, 12px medium, 꼬리 2개
 *  - main_char (svg): left=82 top=346 196×207 → '22.8% / 43.25% / 54.4% / aspect 196:207'
 *  - sub_char (Idle Flower lottie, active+idle): left=152 top=317 57×59 → '42.2% / 39.6% / 15.8% / 57:59'
 *  - 하단: MainButton (status idle/worry-time)
 *
 * 상태별 버튼 동작:
 *  - 활성 (active/inProgress/advanced):
 *      좌측 "필사하기" → Copywrite, 우측 "걱정 정리하기" → WorryTime
 *  - 비활성 (idle/delayed/locked/completed):
 *      좌측 시계 박스 (00:00 + 걱정타임까지 남은 시간) 탭 → NotWorryTime 시트
 *      우측 "걱정 맡겨두기" → Memo
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { getUserProfile, getTimerState, getMonthRecords } from '../storage/storage';
import type { UserProfile, WorkerState, DayRecord } from '../storage/types';
import { resolveState } from '../timer/stateMachine';
import { getNextPrimaryAlarm } from '../timer/worryTimeWindow';
import { MainButton } from '../components/MainButton';
import { SpeechBubble } from '../components/SpeechBubble';
import { FlowerGarden } from '../components/FlowerGarden';
import { navigationRef } from '../../App';
import { Text } from '../components/ui';
import { Colors } from '../theme';
const BG_IMAGE = require('../../assets/images/background.png');
const IDLE_FLOWER = require('../../assets/lottie/idle_flower.json');
const MAIN_CHAR_IDLE = require('../../assets/lottie/character_idle.json');

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [appState, setAppState] = useState<WorkerState>('idle');
  const [countdown, setCountdown] = useState<string>('00:00');
  const [now, setNow] = useState<Date>(new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 현재 표시 월 (chevron으로 이동) — 기본: 오늘 기준 연/월
  const today = new Date();
  const [displayedMonth, setDisplayedMonth] = useState<{ year: number; month: number }>({
    year: today.getFullYear(),
    month: today.getMonth() + 1,
  });
  const [monthRecords, setMonthRecords] = useState<Record<string, DayRecord>>({});

  // refresh 로직 — useFocusEffect + navigation state listener 둘 다에서 사용
  const refresh = useCallback(async () => {
    const currentNow = new Date();
    const p = await getUserProfile();
    if (!p) {
      (navigation as any).reset({ index: 0, routes: [{ name: 'Onboarding' }] });
      return;
    }
    const timerState = await getTimerState();
    const state = resolveState(timerState, currentNow, p.worryTime);
    setProfile(p);
    setAppState(state);
    setNow(currentNow);
    setCountdown(computeCountdown(state, currentNow, p, timerState));

    // 현재 표시 월의 record 로드 (꽃밭 표시용)
    const records = await getMonthRecords(displayedMonth.year, displayedMonth.month);
    setMonthRecords(records);
  }, [navigation, displayedMonth.year, displayedMonth.month]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      // 5초 간격 폴링 (이전 30초 → 더 빠른 풀밭 갱신 응답)
      intervalRef.current = setInterval(refresh, 5 * 1000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }, [refresh]),
  );

  // transparentModal (FlowerBloom 등) 위에 있을 때 Home 은 focus blur 안 됨 →
  // useFocusEffect re-fire 안 됨. App-level navigationRef 로 root state 변경 감지.
  // ready 안 됐으면 100ms 간격 폴링.
  useEffect(() => {
    let unsub: (() => void) | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const attach = () => {
      unsub = navigationRef.addListener('state', () => {
        const state = navigationRef.getRootState();
        if (!state) return;
        const topName = state.routes[state.routes.length - 1]?.name;
        if (topName === 'Home') {
          if (__DEV__) console.log('[Home] state listener → refresh');
          refresh();
        }
      });
    };

    if (navigationRef.isReady()) {
      attach();
    } else {
      intervalId = setInterval(() => {
        if (navigationRef.isReady()) {
          if (intervalId) clearInterval(intervalId);
          attach();
        }
      }, 100);
    }

    return () => {
      if (unsub) unsub();
      if (intervalId) clearInterval(intervalId);
    };
  }, [refresh]);

  if (!profile) {
    return <SafeAreaView style={styles.screen} edges={['top']} />;
  }

  const isActive =
    appState === 'active' ||
    appState === 'inProgress' ||
    appState === 'advanced';

  const headerDate = `${displayedMonth.year}.${String(displayedMonth.month).padStart(2, '0')}`;

  // 월별 꽃밭 네비게이션
  const handlePrevMonth = () => {
    setDisplayedMonth((m) => {
      const month = m.month - 1;
      if (month < 1) return { year: m.year - 1, month: 12 };
      return { year: m.year, month };
    });
  };
  const handleNextMonth = () => {
    setDisplayedMonth((m) => {
      const month = m.month + 1;
      if (month > 12) return { year: m.year + 1, month: 1 };
      return { year: m.year, month };
    });
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* 1) 하늘색 베이스 */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.sky }]} />
      {/* 2) 배경 이미지 — 하단 앵커, 비율 유지 */}
      <Image source={BG_IMAGE} style={styles.bgImage} resizeMode="cover" />

      {/* 3) 꽃밭 — 표시 월의 record 들을 언덕 위에 idle 로 배치 (캐릭터보다 뒤) */}
      <FlowerGarden records={monthRecords} />

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
            <Ionicons name="chevron-back" size={18} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerDate}>{headerDate}</Text>
          <TouchableOpacity
            onPress={handleNextMonth}
            hitSlop={{ top: 10, bottom: 10, left: 4, right: 10 }}
          >
            <Ionicons name="chevron-forward" size={18} color="#000" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => navigation.navigate('Settings')}
          accessibilityLabel="설정"
        >
          <Ionicons name="settings-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* 말풍선 — active 일 때만 (figma top=234, center) */}
      {isActive && (
        <View style={styles.bubbleAnchor} pointerEvents="none">
          <SpeechBubble tailAlign="center" width="auto">
            <Text variant="xsMedium" align="center" style={styles.bubbleText}>
              {'지금은 '}
              <Text variant="xsMedium" align="center" style={styles.bubbleHighlight}>
                걱정타임
              </Text>
              {'이에요!\n메모해둔 걱정을 정리하거나,\n걱정이 없다면 필사로 시작해보세요 📖'}
            </Text>
          </SpeechBubble>
        </View>
      )}

      {/* main_char (lottie idle) — active/idle 모두 동일 위치 */}
      <View style={styles.mainCharAnchor} pointerEvents="none">
        <LottieView
          source={MAIN_CHAR_IDLE}
          autoPlay
          loop
          style={styles.mainCharLottie}
          resizeMode="contain"
        />
      </View>

      {/* sub_char (Idle Flower lottie) — active/idle 모두 머리 위 */}
      <View style={styles.subCharAnchor} pointerEvents="none">
        <LottieView
          source={IDLE_FLOWER}
          autoPlay
          loop
          style={styles.subCharLottie}
          resizeMode="contain"
        />
      </View>

      {/* 하단 액션 영역 */}
      <View style={styles.bottomBar}>
        <MainButton
          status={isActive ? 'worry-time' : 'idle'}
          remainingTime={countdown}
          onPressLeft={
            isActive
              ? () => navigation.navigate('Copywrite')
              : () => navigation.navigate('NotWorryTime')
          }
          onPressRight={
            isActive
              ? () => navigation.navigate('WorryTimeEntry')  // 5초 카운트다운 후 WorryTime
              : () => navigation.navigate('Memo')
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
  // 피그마 main-button 좌측 시계 박스 사양 — 항상 HH:MM 형식
  const diffSec = Math.max(0, Math.floor((toMs - fromMs) / 1000));
  const h = Math.floor(diffSec / 3600);
  const m = Math.floor((diffSec % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ─── 스타일 (반응형: 화면 비율 % + aspectRatio) ─────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.white },

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
    backgroundColor: '#d9d9d9',
    justifyContent: 'center', alignItems: 'center',
  },
  logoText: { fontSize: 12, color: '#000', letterSpacing: -0.24 },

  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerDate: {
    fontSize: 16, fontWeight: '600', color: '#000',
    letterSpacing: -0.32,
    minWidth: 80, textAlign: 'center',
  },

  settingsBtn: {
    width: 40, height: 40,
    justifyContent: 'center', alignItems: 'center',
  },

  // 배경 이미지 (피그마와 동일 비율)
  bgImage: {
    position: 'absolute',
    bottom: 0,
    left: 0, right: 0,
    width: '100%',
    aspectRatio: 360 / 800,
  },

  // 말풍선 (figma top=234 → 29.25%, center 정렬)
  bubbleAnchor: {
    position: 'absolute',
    top: '28%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bubbleText: {
    lineHeight: 16, // 12 * 1.3
  },
  bubbleHighlight: {
    color: Colors.mainGreen,
    fontWeight: '600',
  },

  // main_char (figma left=82 top=346 196×207)
  mainCharAnchor: {
    position: 'absolute',
    left: '22.8%',  // 82/360
    top: '43.25%',  // 346/800
    width: '54.4%', // 196/360
    aspectRatio: 196 / 207,
  },
  mainCharLottie: {
    width: '100%',
    height: '100%',
  },

  // sub_char (figma left=152 top=317 57×59) — Lottie 내부 padding 보정으로 25% 사용
  // (figma 15.8% 그대로면 Lottie 캔버스 안의 꽃이 너무 작게 보임)
  subCharAnchor: {
    position: 'absolute',
    left: '38.2%',   // 25%가 되어 가운데 정렬되도록 보정 (152/360 = 42.2% 였던 중심 유지)
    top: '37%',    // 살짝 위로 올려 머리 위에 자연스럽게
    width: '25%',
    aspectRatio: 57 / 59,
  },
  subCharLottie: {
    width: '100%',
    height: '100%',
  },

  // 하단 액션 — MainButton width=320 고정 중앙 정렬
  bottomBar: {
    position: 'absolute',
    bottom: 32,
    left: 0, right: 0,
    alignItems: 'center',
  },
});
