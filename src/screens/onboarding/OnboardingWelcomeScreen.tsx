import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { BottomButton } from '../../components/ui';
import { OnboardingHeader } from '../../components/OnboardingHeader';
import { Colors, useResponsive } from '../../theme';

const CHARACTER_BOX = require('../../../assets/images/onboarding_character_box.png');
const CHARACTER_SMALL = require('../../../assets/images/onboarding_character_small.png');

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingWelcome'>;

export default function OnboardingWelcomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { wp, hp } = useResponsive();

  // 피그마 상의 Y 좌표 (Screen 기준)에서 안전영역(top)을 빼주어
  // SafeAreaView 내부에서 정확한 위치에 렌더링되게 합니다.
  const textAreaTop = Math.max(0, hp(182) - insets.top);
  const bigImageTop = Math.max(0, hp(361) - insets.top);
  const smallImageTop = Math.max(0, hp(504) - insets.top);

  return (
    <SafeAreaView style={styles.container}>
      {/* 텍스트 영역 */}
      <View style={{ position: 'absolute', top: textAreaTop, left: 0, right: 0 }}>
        <OnboardingHeader
          title={'온종일 따라다니는 걱정,\n이제 그만 덜어내 볼까요?'}
          subtitle={'하루 딱 한번만 걱정을 정리하고\n다시 일상으로 돌아가보세요'}
        />
      </View>

      {/* 캐릭터 이미지 (절대 좌표 배치) */}
      <Image
        source={CHARACTER_BOX}
        style={{
          position: 'absolute',
          top: bigImageTop,
          left: wp(79),
          width: wp(228),
          height: hp(228),
        }}
        resizeMode="contain"
      />
      
      <Image
        source={CHARACTER_SMALL}
        style={{
          position: 'absolute',
          top: smallImageTop,
          left: wp(52),
          width: wp(75),
          height: hp(75),
          transform: [{ scaleX: -1 }],
        }}
        resizeMode="contain"
      />

      {/* 하단 버튼 — figma 677:768 bottom-button (네비바 위로 띄움) */}
      <BottomButton
        label="다음"
        onPress={() => navigation.navigate('OnboardingNickname')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
});
