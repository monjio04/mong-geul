import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { Button, Text } from '../../components/ui';
import { Colors, Spacing } from '../../theme';

const CHARACTER_BOX = require('../../../assets/images/onboarding_character_box.png');
const CHARACTER_SMALL = require('../../../assets/images/onboarding_character_small.png');

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingWelcome'>;

export default function OnboardingWelcomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  // 피그마 Frame 106 y=182 (status bar 포함 절대값)
  // SafeAreaView가 inset.top만큼 자동 padding → 추가로 (182 - inset.top) 만큼 띄움
  const textAreaTop = Math.max(0, 182 - insets.top);

  return (
    <SafeAreaView style={styles.container}>
      {/* 텍스트 영역 */}
      <View style={[styles.textArea, { marginTop: textAreaTop }]}>
        <Text variant="displayLarge" align="center">
          {'온종일 따라다니는 걱정,\n이제 그만 덜어내 볼까요?'}
        </Text>
        <Text variant="bodyMedium" color="darkGray" align="center" style={styles.subtitle}>
          {'하루 딱 한번만 걱정을 정리하고\n다시 일상으로 돌아가보세요'}
        </Text>
      </View>

      {/* 캐릭터 이미지 */}
      <View style={styles.imageWrapper}>
        <Image source={CHARACTER_BOX} style={styles.boxImage} resizeMode="contain" />
        <Image source={CHARACTER_SMALL} style={styles.smallImage} resizeMode="contain" />
      </View>

      {/* 하단 버튼 */}
      <Button
        variant="primary"
        size="lg"
        label="다음"
        onPress={() => navigation.navigate('OnboardingNickname')}
        style={styles.button}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  // 피그마 Frame 106: x=45, w=270 → paddingHorizontal: 45
  // marginTop은 useSafeAreaInsets로 동적 계산 (피그마 y=182)
  textArea: {
    alignItems: 'center',
    paddingHorizontal: 45,
    gap: 17, // 피그마 onboarding-head 내부 spacing
  },
  subtitle: {
    lineHeight: 22.5,
  },
  imageWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxImage: { width: 228, height: 228 },
  smallImage: {
    position: 'absolute',
    bottom: Spacing.xxxxxl, // 40
    left: '18%',
    width: 75,
    height: 75,
  },
  // 피그마 bottom-button: x=17, y=702, w=325, h=56 (화면 800)
  // marginBottom = 800 - 702 - 56 = 42
  button: {
    marginHorizontal: 17,
    marginBottom: 42,
  },
});
