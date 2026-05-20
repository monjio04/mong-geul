/**
 * 온보딩 가이드 (OnboardingGuideScreen) — 피그마 "가이드" 섹션 (node 301:5384)
 *
 * 진입: OnboardingPermission 완료 → RootStack.reset({ Home, OnboardingGuide })
 *
 * 슬라이드 4개 — 화면 터치 시 다음 슬라이드로 전환.
 *   guide1: 인사 + 캐릭터 머리 위 꽃 + MainButton(idle, left highlight)
 *   guide2: 걱정타임 안내 + MainButton(worry-time, right highlight) + 버튼 위 작은 꽃
 *   guide3: 잠금 안내 + MainButton(idle, right highlight) + 버튼 위 작은 꽃
 *   guide4: 시작 CTA — 텍스트박스 안에 "시작하기!" 버튼 → navigation.goBack()
 *
 * 배경: Home과 동일한 background.png + 캐릭터 Lottie 를 가이드 안에서 직접 렌더.
 *       그 위에 dim overlay → 강조 요소(sub_char, textbox, MainButton) 노출.
 *
 * MainButton highlight (가이드 전용):
 *   guide1 → 'left'  (00:00 시계 박스 강조)
 *   guide2 → 'right' (걱정 정리하기 강조)
 *   guide3 → 'right' (걱정 맡겨두기 강조)
 *   guide4 → 'none'  (텍스트박스 내부 시작하기! 만 활성)
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Text, Button } from '../components/ui';
import { MainButton, type MainButtonHighlight } from '../components/MainButton';
import { Colors, Radii, useResponsive } from '../theme';
import { getUserProfile } from '../storage/storage';

const BG_IMAGE = require('../../assets/images/background.png');
const CHARACTER_LOTTIE = require('../../assets/lottie/character_idle.json');
const SUB_CHAR = require('../../assets/images/sub_char.png');

type Props = NativeStackScreenProps<RootStackParamList, 'OnboardingGuide'>;

export default function OnboardingGuideScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { wp, hp } = useResponsive();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [nickname, setNickname] = useState('하루');

  useEffect(() => {
    (async () => {
      const p = await getUserProfile();
      if (p?.nickname) setNickname(p.nickname);
    })();
  }, []);

  const handleTap = () => {
    if (step < 4) setStep((step + 1) as 1 | 2 | 3 | 4);
  };

  const handleStart = () => {
    navigation.goBack();
  };

  // ── 슬라이드별 사양 ──
  const mainButtonStatus: 'idle' | 'worry-time' = step === 2 ? 'worry-time' : 'idle';
  const mainButtonHighlight: MainButtonHighlight =
    step === 2 ? 'right' : step === 3 ? 'both' : 'none';

  // sub_char (꽃) — guide1/4 = 캐릭터 머리 위, guide2/3 = 버튼 위
  const subCharOnHead = step === 1 || step === 4;
  const subCharTop = subCharOnHead
    ? hp(250) // 캐릭터 기준(%)이므로 insets.top을 빼지 않아야 머리 위에 정확히 안착함
    : Math.max(0, hp(639) - insets.top);
  // 버튼 위 위치: guide2 = 우측 (걱정 정리하기) 위, guide3 = 우측 (걱정 맡겨두기) 위
  // Home main-button x=20, w=320. 우측 박스 시작 = 20+132+8 = 160, 가운데 ≈ 160+90 = 250.
  // 피그마는 guide2 x=227 / guide3 x=162 인데 우측 박스 중앙(약 250) 또는 좌측 박스 중앙(약 86)에
  // 정확히 맞추지 않고 피그마 좌표 그대로 사용.
  const subCharLeft = subCharOnHead
    ? wp(166)
    : step === 2
      ? wp(227)
      : wp(162);

  const cardLeft = wp(33);
  const cardTop = Math.max(0, hp(445) - insets.top);
  const cardWidth = wp(294);

  const hintTop = Math.max(0, hp(557.5) - insets.top);
  const mainBtnTop = Math.max(0, hp(686) - insets.top);

  // 캐릭터 — 피그마 main_char (360×800 기준 x=110, y=265, w=156, h=165)
  // 반응형: 화면 비율(%)로 위치/크기 잡고 aspectRatio로 비율 유지 (디바이스별 늘어남 방지)

  // ── 슬라이드별 본문 ──
  const renderCardContent = () => {
    if (step === 1) {
      return (
        <Text variant="title" align="center" style={styles.cardBody}>
          {`안녕하세요! 저는 ${nickname}이에요.\n`}
          <Text variant="title" color="mainGreen">하루틈</Text>
          에 대해 알려드릴게요!
        </Text>
      );
    }
    if (step === 2) {
      return (
        <Text variant="title" align="center" style={styles.cardBody}>
          {'걱정타임은 '}
          <Text variant="title" color="mainGreen">하루에 한 번</Text>
          {'만 열려요.\n알림을 받은 뒤 1시간 30분 안에\n오늘의 걱정을 정리할 수 있어요.'}
        </Text>
      );
    }
    if (step === 3) {
      return (
        <Text variant="title" align="center" style={styles.cardBody}>
          {'걱정타임 전에는 버튼이 잠겨 있어요.\n갑자기 떠오른 걱정은 메모로\n잠깐 맡겨둘 수 있어요.'}
        </Text>
      );
    }
    return (
      <>
        <Text variant="title" align="center" style={styles.cardBody}>
          {'이제 '}
          <Text variant="title" color="mainGreen">하루틈</Text>
          {'을 시작해볼까요?'}
        </Text>
        <Button
          variant="primary"
          size="md"
          label="시작하기!"
          onPress={handleStart}
          style={[styles.startBtn, { width: wp(221), height: hp(37) }]}
        />
      </>
    );
  };

  return (
    <View style={styles.root}>
      {/* ── Home-like 배경 ── */}
      {/* 1) 하늘색 베이스 */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.sky }]} />
      {/* 2) 배경 이미지 — 하단 앵커 (이건 dim 아래에 둬서 어둡게 깔림) */}
      <Image source={BG_IMAGE} style={styles.bgImage} resizeMode="cover" />

      {/* ── Dim overlay (가이드 모드) ── */}
      <Pressable
        style={[StyleSheet.absoluteFill, styles.dim]}
        onPress={handleTap}
      />

      {/* ── 강조 요소들 (dim 위) ── */}
      {/* 캐릭터 Lottie — 반응형 (% + aspectRatio, 모든 디바이스 비율 유지) */}
      <View pointerEvents="none" style={styles.characterWrap}>
        <LottieView
          source={CHARACTER_LOTTIE}
          autoPlay
          loop
          style={styles.character}
          resizeMode="contain"
        />
      </View>

      {/* sub_char (꽃) — 슬라이드별 위치 */}
      <Image
        source={SUB_CHAR}
        style={{
          position: 'absolute',
          left: subCharLeft,
          top: subCharTop,
          width: wp(45),
          height: hp(47),
        }}
        resizeMode="contain"
        pointerEvents="none"
      />

      {/* 텍스트박스 */}
      <View
        pointerEvents="box-none"
        style={[
          styles.card,
          {
            left: cardLeft,
            top: cardTop,
            width: cardWidth,
            paddingVertical: step === 4 ? hp(23) : hp(19),
            paddingHorizontal: wp(15),
          },
        ]}
      >
        {renderCardContent()}
      </View>

      {/* "화면을 터치해 다음으로 넘어가요" — guide1 전용 */}
      {step === 1 && (
        <Text
          variant="body"
          color="darkGray"
          align="center"
          style={[styles.hint, { top: hintTop, fontWeight: '600' }]}
        >
          화면을 터치해 다음으로 넘어가요
        </Text>
      )}

      {/* MainButton — 슬라이드별 status + highlight */}
      <View
        pointerEvents="box-none"
        style={[styles.mainBtnWrap, { top: mainBtnTop }]}
      >
        <MainButton
          status={mainButtonStatus}
          highlight={mainButtonHighlight}
          leftPressableInIdle={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  // Home과 동일한 배경 패턴
  bgImage: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    aspectRatio: 360 / 800,
  },
  // 캐릭터 — 화면 비율 기반 (피그마 360×800: top=265, left=110, w=156, h=165)
  characterWrap: {
    position: 'absolute',
    top: '33.1%',        // 265/800
    left: '30.5%',       // 110/360
    width: '43.3%',      // 156/360
    aspectRatio: 156 / 165, // 비율 유지 — height 자동
  },
  character: {
    width: '100%',
    height: '100%',
  },
  // dim
  dim: {
    backgroundColor: Colors.backdrop, // rgba(0,0,0,0.5)
  },
  // 강조 요소
  card: {
    position: 'absolute',
    backgroundColor: Colors.lightGray100,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    lineHeight: 24,
  },
  startBtn: {
    marginTop: 10,
    borderRadius: Radii.sm,
  },
  hint: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  mainBtnWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
