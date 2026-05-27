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

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, StyleSheet, StatusBar, ScrollView, Alert, Vibration, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import {
  getUserProfile, saveUserProfile,
  getTimerState,
  incrementWorryCompleteCount,
  getCycleMemos,
} from '../storage/storage';
import type { UserProfile, MemoEntry } from '../storage/types';
import { startTimer, completeTimer, startAdvanced } from '../timer/timerService';
import { resolveState } from '../timer/stateMachine';
import { Button, Text } from '../components/ui';
import { SpeechBubble } from '../components/SpeechBubble';
import { AudioToggleIcon } from '../components/AudioToggleIcon';
import { WorryTimer } from '../components/WorryTimer';
import { Colors, Radii, useResponsive } from '../theme';
import { playBgm, stopBgm, resetBgmSession } from '../audio/bgm';
import { isNfcSession, playFrog5min, playFrogEnd } from '../audio/frog';
import MainCharSvg from '../../assets/images/main_char.svg';
import worryHintsData from '../../assets/worry_hints.json';

type Props = NativeStackScreenProps<RootStackParamList, 'WorryTime'>;

// ─── 캐릭터 말풍선 phrase (assets/worry_hints.json) ───────
const WORRY_HINTS = worryHintsData as string[];

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
  const [memos, setMemos] = useState<MemoEntry[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  // 타이머 시간 텍스트 표시 토글 — 화면 아무 곳이나 탭 시 on/off
  // ended 상태에서는 WorryTimer 가 항상 표시하므로 이 state 와 무관
  const [timerVisible, setTimerVisible] = useState(false);

  // mount: profile 로드 + timer 시작 (없으면 fallback) + 실제 메모 로드
  useEffect(() => {
    (async () => {
      const p = await getUserProfile();
      if (!p) {
        navigation.goBack();
        return;
      }
      setProfile(p);

      let timerState = await getTimerState();

      // NotWorryTime 경로(idle 상태)로 진입 시 startAdvanced 호출 → 사이클 앞당기기
      // Home active 경로면 이미 active 라 호출 안 됨
      const state = resolveState(timerState, new Date(), p.worryTime);
      if (state === 'idle' && !timerState.startedAt) {
        await startAdvanced();
        timerState = await getTimerState();
      }

      if (!timerState.startedAt) {
        await startTimer(p.focusMinutes);
        timerState = await getTimerState();
      }
      setStartedAt(timerState.startedAt);

      // 이번 사이클에 작성된 메모(addMemo로 저장된) 로드
      const cycleMemos = await getCycleMemos();
      setMemos(cycleMemos);
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

  // 타이머 종료 시 1회 진동 트리거를 위한 플래그
  const vibratedRef = useRef(false);
  // 🐸 음원 — NFC 세션 때만 5분/끝 시점에 1회 재생 (중복 방지 ref)
  const frog5minPlayedRef = useRef(false);
  const frogEndPlayedRef = useRef(false);

  // 1초마다 elapsedSec 갱신 + 5분 남은 시점 / 종료 시점 음원
  useEffect(() => {
    if (!startedAt) return;
    const totalSec = (profile?.focusMinutes ?? 20) * 60;
    const tick = async () => {
      const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
      setElapsedSec(elapsed);

      const remaining = totalSec - elapsed;
      // 🐸 5분 남았을 때 — NFC 세션만, 1회만
      if (
        !frog5minPlayedRef.current &&
        remaining <= 5 * 60 &&
        remaining > 5 * 60 - 2 // 5분 ~ 4분 58초 사이 (1초 tick 놓침 방지)
      ) {
        frog5minPlayedRef.current = true;
        if (await isNfcSession()) playFrog5min();
      }
      // 🐸 타이머 종료 시 — NFC 세션만, 1회만
      if (!frogEndPlayedRef.current && elapsed >= totalSec) {
        frogEndPlayedRef.current = true;
        if (await isNfcSession()) playFrogEnd();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt, profile?.focusMinutes]);

  // focusMinutes 경과 시 1회 진동 + BGM 세션 종료 — 알림음 없이 부드러운 종료 알림
  useEffect(() => {
    if (!profile) return;
    const totalSec = profile.focusMinutes * 60;
    if (elapsedSec >= totalSec && !vibratedRef.current) {
      vibratedRef.current = true;
      // 짧은 패턴 진동 (250ms x 2, gap 200ms) — 알림음 대체용 부드러운 진동
      Vibration.vibrate([0, 250, 200, 250]);
      // 타이머 종료 → BGM 세션 종료 (정지 + 트랙 선택 해제 → 다음 세션 새 랜덤)
      void resetBgmSession();
    }
  }, [elapsedSec, profile]);

  // BGM 재생/정지 토글
  //   - 화면 진입 + audioEnabled = true → 세션 트랙 재생 (첫 진입 시 랜덤 선택)
  //   - 토글 OFF → stopBgm() (트랙 선택은 유지 → 같은 트랙 재개 가능)
  //   - 토글 ON 다시 → 동일 트랙 처음부터 재생
  useEffect(() => {
    if (!profile?.audioEnabled) {
      void stopBgm();
      return;
    }
    // 타이머 이미 종료된 상태로 진입했다면 재생 X
    const totalSec = profile.focusMinutes * 60;
    if (elapsedSec >= totalSec) return;

    void playBgm();
    // 이 effect 의 cleanup 은 toggle off 케이스에서만 의미 — unmount cleanup 은 아래 별도 effect 에서 처리
  }, [profile?.audioEnabled, profile?.focusMinutes]); // elapsedSec 변경마다 재실행 방지

  // 화면 unmount 시 BGM 세션 완전 종료 (트랙 선택도 해제 → 다음 걱정타임 새 랜덤)
  useEffect(() => {
    return () => {
      void resetBgmSession();
    };
  }, []);

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

      // 걱정타임 2번째 완료 시 점검 안내 모달 (1회성)
      const CHECKIN_THRESHOLD = 2;

      if (count === CHECKIN_THRESHOLD) {
        // navigate: WorryTime 화면을 history에 유지 → 모달 뒤에 걱정 화면 보임
        // (replace 사용 시 WorryTime이 스택에서 빠져 Home이 뒤로 비치는 문제)
        navigation.navigate('WorryCheckIn', {
          from: 'worry',
          worryHour,
          status: result.status,
          flowerType: result.flowerType,
        });
      } else {
        navigation.replace('Reward', {
          from: 'worry',
          worryHour,
          status: result.status,
          flowerType: result.flowerType,
        });
      }
      console.log('[WorryTime] 완료:', result, 'count:', count);
    } catch (e) {
      Alert.alert('오류', '완료 처리 중 문제가 생겼어요.');
      console.error('[WorryTime] complete error:', e);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── 좌표 보정 ──────────────────────────────────────────
  // 피그마 y 값을 그대로 사용 (status bar baseline 24 빼고 insets.top 보정).
  // hp 스케일을 빼서 세로로 늘어나는 '찌부' 현상 방지 — figma 절대 위치 유지.
  const adjustTop = (figmaY: number) => (figmaY - FIGMA_STATUSBAR) + insets.top;

  const totalSec = (profile?.focusMinutes ?? 20) * 60;
  const isCompleteAvailable = elapsedSec >= COMPLETE_THRESHOLD_SEC;
  // 타이머 만료 — figma 679:900 "걱정타임-시간 끝난 후"
  const isTimerEnded = elapsedSec >= totalSec;

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

    // figma 116:385/679:907 — main_char x=241, 114×120 (세로 hp 스케일 빼서 자연 비율)
    mainChar: {
      position: 'absolute',
      left: wp(241),
      width: wp(114),
      height: wp(114) * (120 / 114), // 가로 비율 따라 높이 자동
    },

    timerWrap: {
      position: 'absolute',
      left: wp(18),
    },

    // 메모 영역 (피그마 y=358부터 화면 끝까지) — top 고정 + bottom 0 으로 남은 공간 flex
    memoArea: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0, // 화면 끝까지
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
    // memoArea 안에서 남은 공간 flex 채움 (memoArea bottom 까지)
    memoList: {
      marginLeft: wp(22),
      width: wp(315),
      flex: 1,
    },
    memoListInner: {
      gap: hp(8),
      paddingBottom: hp(120),
    },
    // figma 116:395 worrytime-memo-list 아이템:
    //   bg lightGray200, rounded-16, h-82 justify-center
    //   pt-18 pb-16 px-15, gap-4 (본문 ↔ 시간 행)
    memoCard: {
      width: wp(315),
      minHeight: hp(82),               // figma h-82 (긴 메모는 자연스럽게 늘어남)
      justifyContent: 'center',        // figma justify-center
      backgroundColor: Colors.lightGray200,
      borderRadius: Radii.lg,          // figma rounded-16
      paddingTop: hp(18),
      paddingHorizontal: wp(15),
      paddingBottom: hp(16),           // figma pb-16 (이전 hp(8))
    },
    memoText: {},
    // figma gap-4 (이전 marginTop hp(16))
    memoTimeRow: {
      marginTop: hp(4),
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

  // 화면 아무 곳이나 탭 시 타이머 토글 (버튼/스위치 등 자체 핸들러 가진 자식은 우선 작동)
  const handleScreenTap = () => {
    setTimerVisible((v) => !v);
  };

  return (
    <Pressable style={styles.container} onPress={handleScreenTap}>
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

      {/* SpeechBubble
         - 진행 중 (figma 116:385): x=75, y=137, 랜덤 phrase
         - 종료 후 (figma 679:900): x=75, y=126, "오늘의 걱정타임 끝!" 멘트 */}
      <View style={[styles.speechWrap, { top: adjustTop(isTimerEnded ? 126 : 137) }]}>
        {isTimerEnded ? (
          <SpeechBubble>
            <Text variant="sm" align="center" style={{ maxWidth: 170, width: 170 }}>
              {'오늘의 걱정타임 끝!\n아래 \''}
              <Text variant="sm" color="mainGreen">작성 완료</Text>
              {'\' 버튼을 눌러\n마무리해요 ☺️'}
            </Text>
          </SpeechBubble>
        ) : (
          <SpeechBubble text={hint} />
        )}
      </View>

      {/* main_char 큰 꽃 SVG (x=241, y=204, 114×120) — 가로 비율 기준 */}
      <View style={[styles.mainChar, { top: adjustTop(204) }]}>
        <MainCharSvg width={wp(114)} height={wp(114) * (120 / 114)} />
      </View>

      {/* WorryTimer (x=18, y=304, 325×37) — 화면 탭으로 selected 토글 */}
      <View style={[styles.timerWrap, { top: adjustTop(304) }]}>
        <WorryTimer
          elapsedSec={elapsedSec}
          totalSec={totalSec}
          selected={timerVisible}
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

      {/* 하단 완료 버튼
         - 10분 ~ 타이머 만료 전: "여기까지만 작성할게요" (조기 완료)
         - 타이머 만료 후: "작성 완료" (figma 679:900, 사용자 액션으로만 진행) */}
      {(isCompleteAvailable || isTimerEnded) && (
        <View style={styles.completeBox}>
          <Button
            variant="primary"
            size="lg"
            label={
              submitting
                ? '처리 중...'
                : isTimerEnded
                  ? '작성 완료'
                  : '여기까지만 작성할게요'
            }
            onPress={handleComplete}
            disabled={submitting}
            style={styles.completeButton}
          />
        </View>
      )}
    </Pressable>
  );
}
