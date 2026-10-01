/**
 * 폰트 패밀리 토큰
 *
 * - 기본: Pretendard (assets/fonts/Pretendard-*.otf). 시스템 글꼴(갤럭시 사용자 설정 글꼴 등)에
 *   영향받지 않도록 번들 폰트로 고정.
 * - handwriting: 캐릭터 말풍선용 손글씨 폰트 (figma "MemomentKkukkukk" / 메모먼트 꾸꾸)
 *
 * 모든 key 는 App.tsx 의 useFonts 에 같은 이름으로 로드돼 있어야 함.
 *
 * 사용 예:
 *   <Text style={{ fontFamily: Fonts.handwriting }}>...</Text>
 *   <TextInput style={withAppFont(styles.input)} />   // 공용 Text 를 거치지 않는 경우
 */

import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';

export const Fonts = {
  regular: 'Pretendard-Regular',
  medium: 'Pretendard-Medium',
  semibold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
  /** 캐릭터 말풍선 손글씨 (MemomentKkukkukk) */
  handwriting: 'MemomentKkukkukk',
} as const;

function pretendardFor(weight: TextStyle['fontWeight']): string {
  switch (String(weight ?? '400')) {
    case '500':
      return Fonts.medium;
    case '600':
      return Fonts.semibold;
    case '700':
    case '800':
    case '900':
    case 'bold':
      return Fonts.bold;
    default:
      return Fonts.regular;
  }
}

/**
 * fontWeight 를 굵기별 Pretendard 파일로 바꿔 끼운 스타일을 반환.
 * Android 는 커스텀 폰트에 fontWeight 를 적용하지 못하므로 weight 대신 family 이름으로 지정해야 함.
 * fontFamily 가 이미 지정된 스타일(손글씨 등)은 그대로 둔다.
 */
export function withAppFont(style: StyleProp<TextStyle>): TextStyle {
  const flat = StyleSheet.flatten(style) ?? {};
  if (flat.fontFamily) return flat;
  const { fontWeight, ...rest } = flat;
  return { ...rest, fontFamily: pretendardFor(fontWeight) };
}
