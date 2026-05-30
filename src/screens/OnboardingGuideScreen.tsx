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
const SUB_JUMP_LOTTIE = require('../../assets/lottie/jump_sub.json');

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

  // 버튼 위 위치 (guide2/3): MainButton wrapper 가 bottom 앵커(h:136, pb:45) 로 바뀌었으므로
  // sub_char 도 bottom 앵커로 맞춰야 버튼 top 에 정확히 붙음.
  //   - 버튼 top from screen bottom = pb(45) + (wrapperH 136 − pb 45 − btnH 72) / 2 + btnH 72
  //                                = 45 + 9.5 + 72 = 126.5
  //   - sub_char.bottom = 126.5 → sub_char 아래 가장자리가 버튼 top 과 정확히 맞물림
  const MAIN_BTN_TOP_FROM_BOTTOM = 105;

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
  // MainButton 은 figma 112:711 wrapper 사양 (bottom 앵커 + pb:45) 으로 변경 — 절대 top 불필요

  // 캐릭터 — 슬라이드별 위치 다름 (figma):
  //   guide1/4 (301:2491 / 301:4911): top=265, left=110  → 화면 중앙 가까이
  //   guide2   (301:2937 main_char):  top=341, left=20   → 좌측 (텍스트 옆)
  //   guide3   (301:3869 main_char):  top=341, left=35   → 좌측 (살짝 안쪽)
  //   크기 156×165 동일
  // 반응형: 화면 비율(%)로 위치/크기 잡고 aspectRatio 로 비율 유지
  const charPos =
    step === 1 || step === 4
      ? { top: '33.1%' as const, left: '30.5%' as const } // 265/800, 110/360
      : step === 2
        ? { top: '39.5%' as const, left: '5.6%' as const } // 341/800, 20/360
        : { top: '39.5%' as const, left: '9.7%' as const }; // 341/800, 35/360

  // ── 슬라이드별 본문 ──
  const renderCardContent = () => {
    if (step === 1) {
      // figma 301:2491 296:2485 — 캐릭터 자기소개 (이름 "몽구리" + 🐸)
      return (
        <Text variant="title" align="center" style={styles.cardBody}>
          {'안녕하세요! 제 이름은 몽구리에요🐸\n'}
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
      {/* 캐릭터 Lottie — step 별 위치 분기 (charPos), 크기/비율 동일 */}
      <View pointerEvents="none" style={[styles.characterWrap, charPos]}>
        <LottieView
          source={CHARACTER_LOTTIE}
          autoPlay
          loop
          style={styles.character}
          resizeMode="contain"
        />
      </View>

      {/* sub_char — guide1/4: 캐릭터 머리 위 (PNG, top 앵커) / guide2/3: 버튼 위 (Lottie jump_sub, bottom 앵커)
          위치/크기(45×47) 피그마 그대로, guide2/3 에서는 점프 애니메이션으로 표현 */}
      {subCharOnHead ? (
        <Image
          source={SUB_CHAR}
          style={{
            position: 'absolute',
            left: subCharLeft,
            width: wp(45),
            height: hp(47),
            top: hp(250),
          }}
          resizeMode="contain"
        />
      ) : (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            // 박스가 커진 만큼 left 도 절반 보정 → 캐릭터 시각적 중심은 그대로
            left: subCharLeft - wp((85 - 60) / 2),
            width: wp(85),
            height: hp(95),
            bottom: MAIN_BTN_TOP_FROM_BOTTOM,
          }}
        >
          <LottieView
            source={SUB_JUMP_LOTTIE}
            autoPlay
            loop
            style={{ width: '100%', height: '100%' }}
            resizeMode="contain"
          />
        </View>
      )}

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

      {/* MainButton — figma 112:711 wrapper (bottom 앵커, pb:45, items-center) */}
      <View
        pointerEvents="box-none"
        style={styles.mainBtnWrap}
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
  // 캐릭터 — 크기/비율만 정의 (top/left 는 step 별 charPos 로 인라인 적용)
  // 피그마 360×800: w=156, h=165 (모든 step 동일 사이즈)
  characterWrap: {
    position: 'absolute',
    width: '43.3%',         // 156/360
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
  // figma 112:711 — w:360, h:136, pb:45, items-center, justify-center (네비바 위로 띄움)
  mainBtnWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 136,
    paddingBottom: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
