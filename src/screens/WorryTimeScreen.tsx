/**
 * 걱정타임 화면 (WorryTimeScreen) — 피그마 걱정타임 (116:385) 기준
 *
 * 진입: 홈 active 상태에서 우측 "걱정 정리하기" 버튼 → WorryTime 라우트
 *
 * 구성 (피그마 360×800 절대좌표):
 *  - 배경: leafBg (#dce8c9)
 *  - 상단 날짜 (center, y=73) + Audio 토글 (x=316, y=66)
 *  - SpeechBubble (x=75, y=137) — 12개 phrase 중 mount 시 1회 랜덤
 *  - main_char 큰 꽃 (x=241, y=204, 114×120)
 *  - WorryTimer (x=18, y=304, 325×37) — 좌→오 채움 / 탭 시 남은 시간
 *  - 메모 영역 (y=358부터)
 *    · "오늘 작성한 메모" 제목 (y=390)
 *    · 메모 카드 리스트 ScrollView (315×352, y=428)
 *  - 10분 후 조건부: "여기까지만 작성할게요" 버튼 (y=702)
 *
 * 타이머:
 *  - mount 시 startedAt 없으면 startTimer(focusMinutes) 호출 (테스트 fallback)
 *  - 1초마다 elapsedSec 갱신 (setInterval)
 *  - elapsedSec >= 600 (10분) 시 종료 버튼 노출
 *
 * 음악 토글: UserProfile.audioEnabled (필사와 동기화)
 * 메모: 임시 6개 하드코딩 (입력 UI 없음, 표시만)
 *
 * 완료 동작: 종료 버튼 → completeTimer(worryTime) → Home reset
 */

import React, { useEffect, useState } from 'react';
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
} from '../storage/storage';
import type { UserProfile, MemoEntry } from '../storage/types';
import { startTimer, completeTimer } from '../timer/timerService';
import { Button, Text } from '../components/ui';
import { SpeechBubble } from '../components/SpeechBubble';
import { AudioToggleIcon } from '../components/AudioToggleIcon';
import { WorryTimer } from '../components/WorryTimer';
import { Colors, Spacing, Radii } from '../theme';
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
    // 각 메모마다 다른 분 단위 시각 (역순으로 최신부터)
    createdAt: new Date(now - (i + 1) * 1000 * 60 * 17).toISOString(),
  }));
}

function pickRandomHint(): string {
  return WORRY_HINTS[Math.floor(Math.random() * WORRY_HINTS.length)];
}

function formatTodayDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `<${y}.${m}.${d}>`;
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

// 피그마 status bar baseline
const FIGMA_STATUSBAR = 24;
const COMPLETE_THRESHOLD_SEC = 10 * 60; // 10분

export default function WorryTimeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
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
        // 테스트 fallback — 알림 외 진입 시
        await startTimer(p.focusMinutes);
        timerState = await getTimerState();
      }
      setStartedAt(timerState.startedAt);
    })();
  }, [navigation]);

  // 1초마다 elapsedSec 갱신
  useEffect(() => {
    if (!startedAt) return;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
      setElapsedSec(elapsed);
    };
    tick(); // 즉시 1회
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
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
      console.log('[WorryTime] 완료:', result);
    } catch (e) {
      Alert.alert('오류', '완료 처리 중 문제가 생겼어요.');
      console.error('[WorryTime] complete error:', e);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── 좌표 보정 ─────────────────────────────────────────
  const topOffset = insets.top - FIGMA_STATUSBAR;
  const adjustTop = (figmaY: number) => figmaY + topOffset;

  const totalSec = (profile?.focusMinutes ?? 20) * 60;
  const isCompleteAvailable = elapsedSec >= COMPLETE_THRESHOLD_SEC;

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

      {/* main_char 큰 꽃 SVG — 피그마 절대좌표 x=241, y=204, 114×120 */}
      <View style={[styles.mainChar, { top: adjustTop(204) }]}>
        <MainCharSvg width={114} height={120} />
      </View>

      {/* WorryTimer (x=18, y=304, 325×37) */}
      <View style={[styles.timerWrap, { top: adjustTop(304) }]}>
        <WorryTimer elapsedSec={elapsedSec} totalSec={totalSec} />
      </View>

      {/* 메모 영역 (y=358부터) — 흰 박스 + top rounded + 위 그림자 */}
      <View style={[styles.memoArea, { top: adjustTop(358) }]}>
        {/* 피그마: 제목 18 / 500 / -0.36 (titleLargeMid) */}
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
              {/* 본문: 15 / 400 / -0.3 (bodyRegular), color #000 */}
              <Text variant="bodyRegular" style={styles.memoText}>{memo.text}</Text>
              <View style={styles.memoTimeRow}>
                {/* 시간: 10 / 400 / -0.2, #000 (피그마 사양) */}
                <Text variant="tiny">
                  {formatMemoTime(memo.createdAt)}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* 메모 하단 fade overlay — 피그마 Frame 442 */}
        <LinearGradient
          colors={['rgba(255,255,255,0)', '#fff']}
          locations={[0, 0.7067]}
          style={styles.fadeOverlay}
          pointerEvents="none"
        />
      </View>

      {/* 10분 후만 — 흰 박스 (메모 fade 가림) + "여기까지만 작성할게요" 버튼
          피그마 Frame 443: w=360, h=120 (박스 위 22 + 버튼 56 + 박스 아래 42)
          bottom 0 — 화면 끝까지 (피그마 의도: 버튼이 밑에서 42dp 위) */}
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

// ─── 스타일 ──────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.leafBg,
  },

  // 상단 날짜 (center)
  dateWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  // Audio (피그마 x=316, right 20)
  audioWrap: {
    position: 'absolute',
    right: 20,
  },

  // SpeechBubble (피그마 x=75)
  speechWrap: {
    position: 'absolute',
    left: 75,
  },

  // main_char (피그마 x=241, 114×120)
  mainChar: {
    position: 'absolute',
    left: 241,
    width: 114,
    height: 120,
  },

  // WorryTimer (피그마 x=18)
  timerWrap: {
    position: 'absolute',
    left: 18,
  },

  // 메모 영역 (피그마 y=358, h=442) — 흰 박스 + top rounded + 위 그림자
  memoArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 442,
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radii.md, // 12
    borderTopRightRadius: Radii.md, // 12
    // box-shadow: 0 -2px 4px 0 rgba(0,0,0,0.10)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 4,
    overflow: 'hidden',
  },
  // "오늘 작성한 메모" 제목 (피그마 x=20, y=32 within frame)
  memoSectionTitle: {
    paddingLeft: 20,
    paddingTop: 32,
    marginBottom: 16, // 70 - 32 - title height (~22) = ~16
  },
  // worrytime-memo-list (피그마 x=22, w=315, h=352)
  memoList: {
    marginLeft: 22,
    width: 315,
    height: 352,
  },
  memoListInner: {
    gap: 8, // 피그마: 카드 사이 8dp
    paddingBottom: 120, // fade 영역만큼 여유
  },

  // worrytime-memo 카드 — 피그마: paddingTop 18, paddingX 15, text→time gap 16, paddingBottom 8
  memoCard: {
    width: 315,
    backgroundColor: Colors.lightGray100,
    borderRadius: Radii.md, // 12
    paddingTop: 18,
    paddingLeft: 15,
    paddingRight: 15,
    paddingBottom: 8,
  },
  memoText: {
    // 본문 (body variant 14/500)
  },
  // 시간 row — 텍스트와 시간 사이 16dp, 우측 정렬
  memoTimeRow: {
    marginTop: 16,
    alignItems: 'flex-end',
  },

  // 메모 하단 fade overlay (피그마 Frame 442: y=322 within memoArea, h=120)
  fadeOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
  },

  // 흰 박스 + 버튼 (10분 후만) — 피그마 Frame 443: w=360, h=120
  // bottom 0 → 화면 끝부터 / paddingTop 22 (박스 위 ↔ 버튼) / 버튼 56 / 자동 paddingBottom 42
  completeBox: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
    backgroundColor: Colors.white,
    paddingTop: 22,
    alignItems: 'center',
  },
  completeButton: {
    width: 325,
  },
});
