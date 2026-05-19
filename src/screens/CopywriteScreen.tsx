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
import { Button, Text } from '../components/ui';
import { SpeechBubble } from '../components/SpeechBubble';
import { AudioToggleIcon } from '../components/AudioToggleIcon';
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
      // 보상 화면 → 3초 후 자동 Home reset (필사용 멘트, 시간대 무관)
      navigation.replace('Reward', { from: 'copywrite' });
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

    // 필사 콘텐츠 카드 — 피그마: w=328, h=313
    card: {
      position: 'absolute',
      left: wp(16),
      width: wp(328),
      height: hp(313),
      backgroundColor: Colors.lightGray100,
      borderRadius: Radii.lg,
      paddingLeft: wp(27),
      paddingRight: wp(28),
      paddingTop: hp(36),
      paddingBottom: hp(56),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 5,
      overflow: 'hidden',
    },
    cardBody: {
      marginTop: hp(31),
    },
    cardBodyText: {
      opacity: 0.8,
      lineHeight: 21,
    },
    cardBodyAuthor: {
      opacity: 0.6,
      lineHeight: 21,
    },

    buttonWrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: hp(42),
      alignItems: 'center',
    },
    completeButton: {
      width: wp(325),
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

      {/* 필사 콘텐츠 카드 (center, y=253) — sub_char 먼저 렌더해 발이 카드 위에 */}
      <View style={[styles.card, { top: adjustTop(253) }]}>
        <Text variant="titleLargeMid">오늘의 필사 콘텐츠</Text>
        {entry && (
          <View style={styles.cardBody}>
            <Text variant="body" style={styles.cardBodyText}>{entry.body}</Text>
            {entry.author ? (
              <Text variant="body" style={styles.cardBodyAuthor}>
                {`\n${entry.author}`}
              </Text>
            ) : null}
          </View>
        )}
      </View>

      {/* sub_char 캐릭터 — 피그마 절대좌표 x=272, y=187, 66×68 */}
      <Image
        source={SUB_CHAR}
        style={[styles.subChar, { top: adjustTop(194) }]}
        resizeMode="contain"
      />

      {/* 작성 완료 버튼 — 화면 끝 42dp 위 (WorryTime과 동일) */}
      <View style={styles.buttonWrap}>
        <Button
          variant="primary"
          size="lg"
          label={submitting ? '처리 중...' : '작성 완료'}
          onPress={handleComplete}
          disabled={submitting}
          style={styles.completeButton}
        />
      </View>
    </View>
  );
}
