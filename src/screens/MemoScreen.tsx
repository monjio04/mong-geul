/**
 * MemoScreen — 피그마 "메모하기" (node 63:9) 사양
 *
 * 진입: Home idle 상태 → "걱정 맡겨두기" 버튼
 *
 * 구성 (피그마 360×800 절대좌표 → wp/hp + insets 보정):
 *  - 헤더: 좌측 exit(20, y=65, 24×24) + 중앙 타이틀 "걱정 맡겨두기" (16px medium)
 *  - 본문: MemoMemo (x=23, y=335, 315×130) — 키보드 자동 표시, 공백 제외 30자 제한
 *  - 하단: bottom-button "작성 완료" (x=17, y=702, 325×56)
 *           text.trim().length > 0 일 때만 활성
 *
 * 흐름: 작성 완료 → addMemo(text) → navigation.replace('MemoComplete')
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  Animated,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Button, Text } from '../components/ui';
import { MemoMemo } from '../components/MemoMemo';
import { Colors, useResponsive } from '../theme';
import { addMemo } from '../storage/storage';
import ExitIcon from '../../assets/icons/exit.svg';

type Props = NativeStackScreenProps<RootStackParamList, 'Memo'>;

export default function MemoScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { wp, hp } = useResponsive();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 키보드 등장 시 메모 박스를 위로 살짝 올림 (figma 절대좌표 레이아웃이 키보드에 가려지지 않게)
  const translateY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => {
      Animated.timing(translateY, {
        toValue: -hp(60),
        duration: 250,
        useNativeDriver: true,
      }).start();
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [translateY, hp]);

  const canSubmit = text.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await addMemo(text.trim());
      navigation.replace('MemoComplete');
    } catch (e) {
      console.error('[MemoScreen] addMemo 오류:', e);
      Alert.alert('저장 실패', '잠시 후 다시 시도해 주세요.');
      setSubmitting(false);
    }
  };

  // 피그마 좌표 (insets 보정) — exit y=65 기준, 타이틀은 같은 row 에 수직 가운데
  const headerTop = Math.max(0, hp(65) - insets.top);
  const memoTop = Math.max(0, hp(335) - insets.top);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 row — exit (좌) + 타이틀 (가운데) + spacer (우, 정렬 맞춤) */}
      <View style={[styles.header, { paddingTop: headerTop }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ExitIcon width={24} height={24} />
        </TouchableOpacity>
        <Text style={styles.title}>걱정 맡겨두기</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* MemoMemo 입력 박스 — 키보드 등장 시 translateY 로 위로 lift */}
      <Animated.View
        style={[
          styles.memoWrap,
          { top: memoTop, left: wp(23), transform: [{ translateY }] },
        ]}
      >
        <MemoMemo value={text} onChangeText={setText} autoFocus />
      </Animated.View>

      {/* 작성 완료 버튼 — 피그마 y=702, w=325 (키보드와 무관, 그대로) */}
      <View style={[styles.bottomWrap, { bottom: hp(42) }]}>
        <Button
          variant="primary"
          size="lg"
          label="작성 완료"
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={{ width: wp(325) }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  // 헤더 row — exit + 타이틀 + spacer 가운데 정렬
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    letterSpacing: -0.32,
  },
  memoWrap: {
    position: 'absolute',
  },
  bottomWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
