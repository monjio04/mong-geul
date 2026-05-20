/**
 * 걱정타임 화면 (WorryTimeScreen) — 피그마 걱정타임 (116:385) 기준
 *
 * 진입: 홈 active 상태에서 우측 "걱정 정리하기" 버튼 → WorryTime 라우트
 *
 * 구성 (피그마 360×800 절대좌표, wp/hp로 반응형 스케일):
 *  - 배경: leafBg (#dce8c9)
 *  - 상단 날짜 (center, y=73) + Audio 토글 (x=316, y=66)
 *  - SpeechBubble (x=75, y=137) — 12개 phrase 중 mount 시 1회 랜덤
 *  - main_char 큰 꽃 (x=241, y=204, 114×120)
 *  - WorryTimer (x=18, y=304, 325×37) — 좌→오 채움 / 탭 시 남은 시간
 *  - 메모 영역 (y=358부터)
 *  - 10분 후 조건부: "여기까지만 작성할게요" 버튼
 *
 * 반응형: wp (가로 비율) + hp (세로 비율), MAX_SCALE 1.2 캡
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View, StyleSheet, StatusBar, ScrollView, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import {
  getUserProfile, saveUserProfile,
  getTimerState,
  incrementWorryCompleteCount,
} from '../storage/storage';
import type { UserProfile, MemoEntry } from '../storage/types';
import { startTimer, completeTimer } from '../timer/timerService';
import { Button, Text } from '../components/ui';
import { SpeechBubble } from '../components/SpeechBubble';
import { AudioToggleIcon } from '../components/AudioToggleIcon';
import { WorryTimer } from '../components/WorryTimer';
import { Colors, Radii, useResponsive } from '../theme';
import MainCharSvg from '../../assets/images/main_char.svg';
import worryHintsData from '../../assets/worry_hints.json';

type Props = NativeStackScreenProps<RootStackParamList, 'WorryTime'>;

// ─── 캐릭터 말풍선 phrase (assets/worry_hints.json) ───────
const WORRY_HINTS = worryHintsData as string[];

// ─── 6개 임시 메모 (공백 미포함 30자 이내) ───────────────
function makePlaceholderMemos(): MemoEntry[] {
  const now = Date.now();
  const texts = [
    '내일 발표가 너무 걱정돼서 잠이 안 와요.',
    '친구와의 약속이 부담스러워요.',
    '시험 준비를 아직 못해서 불안해요.',
    '부모님께 성적 말씀드리기 무서워요.',
    '진로에 대한 고민이 많아요.',
    '자꾸 과거의 실수가 떠올라 힘들어요.',
  ];
  return texts.map((text, i) => ({
    text,
    createdAt: new Date(now - (i + 1) * 1000 * 60 * 17).toISOString(),
  }));
}

function pickRandomHint(): string {
  return WORRY_HINTS[Math.floor(Math.random() * WORRY_HINTS.length)];
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'] as const;

function formatTodayDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const day = DAY_NAMES[now.getDay()];
  return `${y}.${m}.${d} (${day})`;
}

function formatMemoTime(iso: string): string {
  const d = new Date(iso);
  const h24 = d.getHours();
  const isAM = h24 < 12;
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  const hh = String(h12).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${isAM ? '오전' : '오후'} ${hh}:${mm}`;
}

const FIGMA_STATUSBAR = 24;
const COMPLETE_THRESHOLD_SEC = 10 * 60;

export default function WorryTimeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { wp, hp, width, height } = useResponsive();
  const [hint] = useState(() => pickRandomHint());
  const [memos] = useState<MemoEntry[]>(() => makePlaceholderMemos());
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // mount: profile 로드 + timer 시작 (없으면 fallback)
  useEffect(() => {
    (async () => {
      const p = await getUserProfile();
      if (!p) {
        navigation.goBack();
        return;
      }
      setProfile(p);

      let timerState = await getTimerState();
      if (!timerState.startedAt) {
        await startTimer(p.focusMinutes);
        timerState = await getTimerState();
      }
      setStartedAt(timerState.startedAt);
    })();
  }, [navigation]);

  // 걱정타임 중에는 뒤로가기 차단 (Android 하드웨어 백 + iOS swipe-back 모두)
  // GO_BACK / POP 액션만 막고, replace/reset 등 명시적 이동은 허용 — completeTimer→Reward 정상 동작
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      const t = e.data.action.type;
      if (t === 'GO_BACK' || t === 'POP') {
        e.preventDefault();
      }
    });
    return unsubscribe;
  }, [navigation]);

  // 1초마다 elapsedSec 갱신
  useEffect(() => {
    if (!startedAt) return;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
      setElapsedSec(elapsed);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  // ─── 핸들러 ─────────────────────────────────────────────

  const handleToggleAudio = async () => {
    if (!profile) return;
    const updated: UserProfile = { ...profile, audioEnabled: !profile.audioEnabled };
    await saveUserProfile(updated);
    setProfile(updated);
  };

  const handleComplete = async () => {
    if (submitting || !profile) return;
    setSubmitting(true);
    try {
      const result = await completeTimer(profile.worryTime);
      // 누적 카운트 +1 — 2번째이면 점검 안내 모달, 그 외엔 Reward 직진
      const count = await incrementWorryCompleteCount();
      const worryHour = profile.worryTime.hour;

      // TODO 테스트 후 환원: 실제 값은 2 (현재 테스트를 위해 1로 임시 변경)
      const CHECKIN_THRESHOLD = 1;

      if (count === CHECKIN_THRESHOLD) {
        // navigate: WorryTime 화면을 history에 유지 → 모달 뒤에 걱정 화면 보임
        // (replace 사용 시 WorryTime이 스택에서 빠져 Home이 뒤로 비치는 문제)
        navigation.navigate('WorryCheckIn', { from: 'worry', worryHour });
      } else {
        navigation.replace('Reward', { from: 'worry', worryHour });
      }
      console.log('[WorryTime] 완료:', result, 'count:', count);
    } catch (e) {
      Alert.alert('오류', '완료 처리 중 문제가 생겼어요.');
      console.error('[WorryTime] complete error:', e);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── 좌표 보정 (hp 적용) ─────────────────────────────────
  // 피그마 y에서 status bar baseline (24)을 빼고 hp 비율 적용 후 inset 보정
  const adjustTop = (figmaY: number) => hp(figmaY - FIGMA_STATUSBAR) + insets.top;

  const totalSec = (profile?.focusMinutes ?? 20) * 60;
  const isCompleteAvailable = elapsedSec >= COMPLETE_THRESHOLD_SEC;

  // ─── styles 동적 생성 (반응형) ───────────────────────────
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.leafBg,
    },

    dateWrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      alignItems: 'center',
    },

    audioWrap: {
      position: 'absolute',
      right: wp(20),
    },

    speechWrap: {
      position: 'absolute',
      left: wp(75),
    },

    mainChar: {
      position: 'absolute',
      left: wp(241),
      width: wp(114),
      height: hp(120),
    },

    timerWrap: {
      position: 'absolute',
      left: wp(18),
    },

    // 메모 영역 (피그마 y=358, h=442) — 흰 박스 + top rounded + 위 그림자
    memoArea: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: hp(442),
      backgroundColor: Colors.white,
      borderTopLeftRadius: Radii.md,
      borderTopRightRadius: Radii.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.10,
      shadowRadius: 4,
      elevation: 4,
      overflow: 'hidden',
    },
    memoSectionTitle: {
      paddingLeft: wp(20),
      paddingTop: hp(32),
      marginBottom: hp(16),
    },
    memoList: {
      marginLeft: wp(22),
      width: wp(315),
      height: hp(352),
    },
    memoListInner: {
      gap: hp(8),
      paddingBottom: hp(120),
    },
    memoCard: {
      width: wp(315),
      backgroundColor: Colors.lightGray100,
      borderRadius: Radii.md,
      paddingTop: hp(18),
      paddingLeft: wp(15),
      paddingRight: wp(15),
      paddingBottom: hp(8),
    },
    memoText: {},
    memoTimeRow: {
      marginTop: hp(16),
      alignItems: 'flex-end',
    },

    fadeOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: hp(120),
    },

    // 흰 박스 + 버튼 (10분 후만) — 피그마 Frame 443: w=360, h=120
    completeBox: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: hp(120),
      backgroundColor: Colors.white,
      paddingTop: hp(22),
      alignItems: 'center',
    },
    completeButton: {
      width: wp(325),
    },

    // WorryTimer 외부 size override
    timerSize: {
      width: wp(325),
      height: hp(37),
    },
  }), [width, height]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── 렌더 ──────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* 상단 날짜 (center, y=73) */}
      <View style={[styles.dateWrap, { top: adjustTop(73) }]}>
        <Text variant="bodyMedium" align="center">{formatTodayDate()}</Text>
      </View>

      {/* Audio 토글 (x=316, y=66) */}
      <View style={[styles.audioWrap, { top: adjustTop(66) }]}>
        <AudioToggleIcon
          enabled={profile?.audioEnabled ?? true}
          onPress={handleToggleAudio}
        />
      </View>

      {/* SpeechBubble (x=75, y=137) */}
      <View style={[styles.speechWrap, { top: adjustTop(137) }]}>
        <SpeechBubble text={hint} />
      </View>

      {/* main_char 큰 꽃 SVG (x=241, y=204, 114×120) */}
      <View style={[styles.mainChar, { top: adjustTop(204) }]}>
        <MainCharSvg width={wp(114)} height={hp(120)} />
      </View>

      {/* WorryTimer (x=18, y=304, 325×37) */}
      <View style={[styles.timerWrap, { top: adjustTop(304) }]}>
        <WorryTimer
          elapsedSec={elapsedSec}
          totalSec={totalSec}
          style={styles.timerSize}
        />
      </View>

      {/* 메모 영역 (y=358부터) */}
      <View style={[styles.memoArea, { top: adjustTop(358) }]}>
        <Text variant="titleLargeMid" style={styles.memoSectionTitle}>
          오늘 작성한 메모
        </Text>

        <ScrollView
          style={styles.memoList}
          contentContainerStyle={styles.memoListInner}
          showsVerticalScrollIndicator={false}
        >
          {memos.map((memo, idx) => (
            <View key={idx} style={styles.memoCard}>
              <Text variant="bodyRegular" style={styles.memoText}>{memo.text}</Text>
              <View style={styles.memoTimeRow}>
                <Text variant="tiny">
                  {formatMemoTime(memo.createdAt)}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <LinearGradient
          colors={['rgba(255,255,255,0)', '#fff']}
          locations={[0, 0.7067]}
          style={styles.fadeOverlay}
          pointerEvents="none"
        />
      </View>

      {/* 10분 후만 — 흰 박스 + "여기까지만 작성할게요" */}
      {isCompleteAvailable && (
        <View style={styles.completeBox}>
          <Button
            variant="primary"
            size="lg"
            label={submitting ? '처리 중...' : '여기까지만 작성할게요'}
            onPress={handleComplete}
            disabled={submitting}
            style={styles.completeButton}
          />
        </View>
      )}
    </View>
  );
}
