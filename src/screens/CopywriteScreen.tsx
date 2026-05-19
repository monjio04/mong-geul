/**
 * 필사 화면 (CopywriteScreen) — 피그마 걱정타임-필사 (62:48) 기준
 *
 * 진입: 홈 active 상태에서 좌측 "필사하기" 버튼 → Copywrite 라우트
 *
 * 구성 (피그마 360×800 절대좌표):
 *  - 배경: leafBg (#dce8c9)
 *  - 상단 날짜 <YYYY.MM.DD> (center, y=73)
 *  - Audio 토글 (x=316, y=66)
 *  - SpeechBubble (x=95, y=125) — 6개 phrase 중 mount 시 1회 랜덤
 *  - sub_char 캐릭터 (x=272, y=187, 66×68)
 *  - 필사 콘텐츠 카드 (center, y=253, 328×313)
 *    · 제목 "오늘의 필사 콘텐츠" 고정
 *    · 본문 — copywrite.json 6개 중 랜덤 (중복 방지: seen에 없는 것 중 무작위)
 *  - 작성 완료 버튼 (center, y=702)
 *
 * 랜덤 알고리즘:
 *  1) seen = AsyncStorage 에서 이미 본 ID 목록 로드
 *  2) unseen = entries 중 seen에 포함되지 않은 것
 *  3) unseen 비면 → seen 리셋 + unseen = 전체
 *  4) Math.random() 으로 unseen에서 1개 선택 (순서대로가 아님)
 *  5) seen에 picked.id 추가
 *
 * 완료 동작: idle 상태면 startAdvanced → completeTimer → Home reset (기존 로직)
 */

import React, { useEffect, useState } from 'react';
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
import { Colors, Spacing, Radii } from '../theme';
import copywriteData from '../../assets/copywrite.json';

const SUB_CHAR = require('../../assets/images/sub_char.png');

interface CopywriteEntry {
  id: string;
  body: string;
  author?: string;
}

type Props = NativeStackScreenProps<RootStackParamList, 'Copywrite'>;

// ─── 캐릭터 말풍선 6개 phrase (사용자 제공) ───────────────
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

function formatTodayDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `<${y}.${m}.${d}>`;
}

// 피그마 status bar baseline (디자인 기준 ~24dp)
const FIGMA_STATUSBAR = 24;

export default function CopywriteScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [hint] = useState(() => pickRandomHint());
  const [entry, setEntry] = useState<CopywriteEntry | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // SpeechBubble 실제 렌더 높이 — onLayout으로 측정 (1줄/2줄 phrase 모두 동적 대응)
  // sub_char 머리가 SpeechBubble 끝에서 정확히 11dp 떨어지도록 사용.
  // 초기값 51 = 본체(~36) + gap2 + tail1(6) + gap2 + tail2(5) (1줄 기준 추정)
  const [speechH, setSpeechH] = useState(51);

  // mount: profile 로드 + 콘텐츠 랜덤 선택 (중복 방지)
  useEffect(() => {
    (async () => {
      const entries = copywriteData as CopywriteEntry[];

      // 1) seen 목록 로드
      const seen = await getSeenCopywriteIds();

      // 2) seen 제외한 후보 풀
      let unseen = entries.filter(e => !seen.includes(e.id));

      // 3) 모두 봤으면 리셋
      if (unseen.length === 0) {
        await resetCopywriteSeen();
        unseen = entries;
      }

      // 4) 후보 중 Math.random()으로 무작위 선택 (순서대로 X)
      const picked = unseen[Math.floor(Math.random() * unseen.length)];

      // 5) seen 에 picked.id 추가
      await markCopywriteSeen(picked.id);

      setEntry(picked);

      const p = await getUserProfile();
      setProfile(p);
    })();
  }, []);

  // ─── 핸들러 ─────────────────────────────────────────────

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

      // 걱정 타임 시간 외 진입 시 → 앞당기기 처리
      if (state === 'idle') {
        await startAdvanced();
      }

      // 완료 처리 (isDelayed/isAdvanced 플래그에 따라 꽃/새싹 자동)
      const result = await completeTimer(p.worryTime);

      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });

      console.log('[Copywrite] 완료:', result);
    } catch (e) {
      console.error('[Copywrite] complete error:', e);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── 좌표 보정 ─────────────────────────────────────────
  // 피그마는 800dp 절대좌표 (status bar 포함). 폰별 status bar 크기 차이를 insets로 보정.
  const topOffset = insets.top - FIGMA_STATUSBAR;
  const adjustTop = (figmaY: number) => figmaY + topOffset;

  // ─── 렌더 ──────────────────────────────────────────────

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

      {/* SpeechBubble (x=95, y=125) — onLayout으로 실제 height 측정 */}
      <View
        style={[styles.speechWrap, { top: adjustTop(125) }]}
        onLayout={(e) => setSpeechH(e.nativeEvent.layout.height)}
      >
        <SpeechBubble text={hint} />
      </View>

      {/* 필사 콘텐츠 카드 (center, y=253, 328×313) — sub_char 보다 먼저 렌더 (꽃 발 위에 보이도록) */}
      <View style={[styles.card, { top: adjustTop(253) }]}>
        {/* 제목 18px medium (피그마 62:68) */}
        <Text variant="titleLargeMid">오늘의 필사 콘텐츠</Text>
        {entry && (
          <View style={styles.cardBody}>
            {/* 본문 14px medium black/80% (피그마 62:67) */}
            <Text variant="body" style={styles.cardBodyText}>{entry.body}</Text>
            {entry.author ? (
              <Text variant="body" style={styles.cardBodyAuthor}>
                {`\n${entry.author}`}
              </Text>
            ) : null}
          </View>
        )}
      </View>

      {/* sub_char 캐릭터 (x=272, 66×68) — speechBubble 끝 + 11dp 위치
          card 다음에 렌더해 발이 카드 위에 보이도록 */}
      <Image
        source={SUB_CHAR}
        style={[styles.subChar, { top: adjustTop(125) + speechH + 11 }]}
        resizeMode="contain"
      />

      {/* 작성 완료 버튼 (피그마 y=702, w=325, h=56) */}
      <View style={[styles.buttonWrap, { bottom: 42 + insets.bottom }]}>
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

  // Audio 토글 (피그마 x=316, 좌상단 기준 → right 정렬)
  audioWrap: {
    position: 'absolute',
    right: 20, // 360 - 316 - 24 = 20
  },

  // SpeechBubble (피그마 x=95)
  speechWrap: {
    position: 'absolute',
    left: 95,
  },

  // sub_char (피그마 x=272, y=187, 66×68, aspect-ratio 33/34)
  subChar: {
    position: 'absolute',
    left: 272,
    width: 66,
    height: 68,
    aspectRatio: 33 / 34,
  },

  // 필사 콘텐츠 카드 — 피그마: w=328, h=313
  // padding: left 27 / right 28 / top 36 / bottom 56 (피그마 스크린샷 측정)
  card: {
    position: 'absolute',
    left: 16, // (360 - 328) / 2 = 16
    width: 328,
    height: 313,
    backgroundColor: Colors.lightGray100,
    borderRadius: Radii.lg, // 16
    paddingLeft: 27,
    paddingRight: 28,
    paddingTop: 36,
    paddingBottom: 56,
    // drop-shadow (0, 4, 10, -2, 0.25)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
    overflow: 'hidden',
  },
  // 제목 ↔ 본문 gap: 피그마 31 (title y=36, body y=89, title h≈22 → 89-36-22=31)
  cardBody: {
    marginTop: 31,
  },
  // 본문 — Text variant="body" (14/500/-0.28) + opacity 0.8 (피그마 black 80%)
  cardBodyText: {
    opacity: 0.8,
    lineHeight: 21, // 14 * 1.5
  },
  cardBodyAuthor: {
    opacity: 0.6,
    lineHeight: 21,
  },

  // 작성 완료 버튼
  buttonWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  completeButton: {
    width: 325,
  },
});
