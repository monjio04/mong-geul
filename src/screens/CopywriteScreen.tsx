/**
 * 필사 화면 (CopywriteScreen) — 피그마 걱정타임-필사 (62:48) 기준
 *
 * 진입: 홈 active 상태에서 좌측 "필사하기" 버튼 → Copywrite 라우트
 *
 * 구성 (피그마 360×800 절대좌표, wp/hp로 반응형 스케일):
 *  - 배경: leafBg (#dce8c9)
 *  - 상단 날짜 <YYYY.MM.DD> (center, y=73)
 *  - Audio 토글 (x=316, y=66)
 *  - SpeechBubble (x=95, y=125) — 6개 phrase 중 mount 시 1회 랜덤
 *  - sub_char 캐릭터 (x=272, 66×68)
 *  - 필사 콘텐츠 카드 (center, y=253, 328×313)
 *  - 작성 완료 버튼 (center, y=702)
 *
 * 반응형: wp (가로 비율) + hp (세로 비율), MAX_SCALE 1.2 캡
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View, StyleSheet, Image, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import {
  getUserProfile, saveUserProfile,
  getTimerState,
  getSeenCopywriteIds, markCopywriteSeen, resetCopywriteSeen,
} from '../storage/storage';
import type { UserProfile } from '../storage/types';
import { completeTimer, startAdvanced } from '../timer/timerService';
import { resolveState } from '../timer/stateMachine';
import { BottomButton, Text } from '../components/ui';
import { SpeechBubble } from '../components/SpeechBubble';
import { AudioToggleIcon } from '../components/AudioToggleIcon';
import { playBgm, stopBgm, resetBgmSession } from '../audio/bgm';
import { Colors, Radii, useResponsive } from '../theme';
import copywriteData from '../../assets/copywrite.json';

const SUB_CHAR = require('../../assets/images/sub_char.png');

interface CopywriteEntry {
  id: string;
  body: string;
  author?: string;
}

type Props = NativeStackScreenProps<RootStackParamList, 'Copywrite'>;

const COPYWRITE_HINTS = [
  '천천히 따라 쓰며\n마음을 쉬게 해봐요.',
  '문장을 쓰는 동안,\n생각의 속도도 잠깐 늦춰봐요.',
  '한 글자씩 적어도 충분해요.',
  '지금은 잘 쓰는 것보다\n천천히 쓰는 게 더 중요해요.',
  '문장에 잠깐 기대어도 괜찮아요.',
  '마음에 남는 단어가 있다면\n잠깐 더 바라봐도 좋아요.',
];

function pickRandomHint(): string {
  return COPYWRITE_HINTS[Math.floor(Math.random() * COPYWRITE_HINTS.length)];
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

const FIGMA_STATUSBAR = 24;

export default function CopywriteScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { wp, hp, width, height } = useResponsive();
  const [hint] = useState(() => pickRandomHint());
  const [entry, setEntry] = useState<CopywriteEntry | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const entries = copywriteData as CopywriteEntry[];
      const seen = await getSeenCopywriteIds();
      let unseen = entries.filter(e => !seen.includes(e.id));
      if (unseen.length === 0) {
        await resetCopywriteSeen();
        unseen = entries;
      }
      const picked = unseen[Math.floor(Math.random() * unseen.length)];
      await markCopywriteSeen(picked.id);
      setEntry(picked);

      const p = await getUserProfile();
      setProfile(p);
    })();
  }, []);

  // BGM 재생/정지 — 걱정타임 화면과 동일 정책 (단, 필사는 타이머 없음)
  //   - 진입 + audioEnabled = true → 세션 트랙 재생 (첫 진입 시 랜덤 선택)
  //   - 토글 OFF → stopBgm() (트랙 선택은 유지)
  //   - 토글 ON 다시 → 동일 트랙 처음부터 재생
  useEffect(() => {
    if (!profile?.audioEnabled) {
      void stopBgm();
      return;
    }
    void playBgm();
  }, [profile?.audioEnabled]);

  // 화면 unmount 시 BGM 세션 완전 종료 (트랙 선택도 해제 → 다음 세션 새 랜덤)
  useEffect(() => {
    return () => {
      void resetBgmSession();
    };
  }, []);

  const handleToggleAudio = async () => {
    if (!profile) return;
    const updated: UserProfile = { ...profile, audioEnabled: !profile.audioEnabled };
    await saveUserProfile(updated);
    setProfile(updated);
  };

  const handleComplete = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const p = await getUserProfile();
      if (!p) {
        navigation.goBack();
        return;
      }
      const timerState = await getTimerState();
      const state = resolveState(timerState, new Date(), p.worryTime);
      if (state === 'idle') {
        await startAdvanced();
      }
      const result = await completeTimer(p.worryTime);
      // 보상 화면 → 5초 후 FlowerBloom 모달 (꽃/새싹 피는 모션)
      navigation.replace('Reward', {
        from: 'copywrite',
        status: result.status,
        flowerType: result.flowerType,
      });
      console.log('[Copywrite] 완료:', result);
    } catch (e) {
      console.error('[Copywrite] complete error:', e);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── 좌표 보정 (hp 적용) ─────────────────────────────────
  const adjustTop = (figmaY: number) => hp(figmaY - FIGMA_STATUSBAR) + insets.top;

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
      left: wp(95),
    },

    // sub_char (피그마 x=272, y=187, 66×68)
    subChar: {
      position: 'absolute',
      left: wp(272),
      width: wp(66),
      height: hp(68),
      aspectRatio: 33 / 34,
    },

    // 필사 콘텐츠 카드 — figma 474:1001: w=328, height auto (콘텐츠 따라 늘어남)
    //   px-27, py-36, gap-31 (title↔body), shadow 0/4/10 25%
    card: {
      position: 'absolute',
      left: wp(16),
      width: wp(328),
      backgroundColor: Colors.lightGray100,
      borderRadius: Radii.lg,
      paddingHorizontal: wp(27),       // figma px-27 (양쪽 대칭)
      paddingTop: hp(36),              // figma py-36
      paddingBottom: hp(36),           // figma py-36 (이전 hp(56) 에서 수정)
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 5,
      // overflow: 'hidden' 제거 — 콘텐츠 따라 늘어나야 하므로
    },
    cardBody: {
      marginTop: hp(31), // figma gap-31 (title ↔ body)
    },
    cardBodyText: {
      // figma 474:1003 — rgba(0,0,0,0.8), 14px medium, leading-1.5
      // author 도 동일 색상/사이즈 (본문 마지막 줄로 처리)
      opacity: 0.8,
      lineHeight: 21,
    },

  }), [width, height]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* 상단 날짜 (center, y=73) — 피그마 15px medium */}
      <View style={[styles.dateWrap, { top: adjustTop(73) }]}>
        <Text variant="bodyMedium" align="center">{formatTodayDate()}</Text>
      </View>

      {/* Audio 토글 (x=316, y=66, 24×24) */}
      <View style={[styles.audioWrap, { top: adjustTop(66) }]}>
        <AudioToggleIcon
          enabled={profile?.audioEnabled ?? true}
          onPress={handleToggleAudio}
        />
      </View>

      {/* SpeechBubble (x=95, y=125) */}
      <View style={[styles.speechWrap, { top: adjustTop(125) }]}>
        <SpeechBubble text={hint} />
      </View>

      {/* 필사 콘텐츠 카드 (center, y=253) — figma 474:1001
          height 자동 (콘텐츠 따라 늘어남), pb:36 유지, author 는 본문에 통합 */}
      <View style={[styles.card, { top: adjustTop(253) }]}>
        <Text variant="titleLargeMid">오늘의 필사 콘텐츠</Text>
        {entry && (
          <View style={styles.cardBody}>
            <Text variant="body" style={styles.cardBodyText}>
              {entry.body}
              {entry.author ? `\n\n${entry.author}` : ''}
            </Text>
          </View>
        )}
      </View>

      {/* sub_char 캐릭터 — 피그마 절대좌표 x=272, y=187, 66×68 */}
      <Image
        source={SUB_CHAR}
        style={[styles.subChar, { top: adjustTop(194) }]}
        resizeMode="contain"
      />

      {/* 작성 완료 버튼 — figma 677:768 bottom-button (네비바 위로 띄움) */}
      <BottomButton
        label={submitting ? '처리 중...' : '작성 완료'}
        onPress={handleComplete}
        disabled={submitting}
      />
    </View>
  );
}
