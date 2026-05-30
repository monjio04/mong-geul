/**
 * 폰트 패밀리 토큰
 *
 * - handwriting: 캐릭터 말풍선용 손글씨 폰트 (figma "MemomentKkukkukk" / 메모먼트 꾸꾸)
 *     · 폰트 파일: assets/fonts/MemomentKkukkukk.ttf
 *     · App.tsx 의 useFonts 로 동일한 key('MemomentKkukkukk') 로 로드해야 함
 *
 * 사용 예:
 *   import { Fonts } from '../theme';
 *   <Text style={{ fontFamily: Fonts.handwriting }}>...</Text>
 *
 * 주의: fontFamily 를 지정하면 fontWeight 는 (폰트가 단일 weight 일 경우) 무시될 수 있음.
 */

export const Fonts = {
  /** 캐릭터 말풍선 손글씨 (MemomentKkukkukk) */
  handwriting: 'MemomentKkukkukk',
} as const;
