/**
 * AudioToggleIcon — 피그마 audio 컴포넌트 (192:2498)
 *
 * 상태:
 *  - enabled = true  → 음표 (♪) 단독 (audio.svg)
 *  - enabled = false → 음표 + 슬래시 + 원 (noAudio.svg)
 *
 * 자산: `assets/icons/audio.svg` 와 `noAudio.svg` 의 내용을 inline string으로 박아
 *       `react-native-svg` 의 `SvgXml` 로 렌더링합니다.
 *       자산 SVG가 변경되면 아래 두 상수를 함께 업데이트하세요.
 *
 * 사용 예:
 *   <AudioToggleIcon enabled={audioOn} onPress={toggle} />
 */

import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';

// ─── SVG XML (assets/icons/audio.svg, noAudio.svg 와 1:1 동기화) ────────

const AUDIO_ON_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M5.25 18.75C5.25 19.7446 5.64509 20.6984 6.34835 21.4017C7.05161 22.1049 8.00544 22.5 9 22.5C9.99456 22.5 10.9484 22.1049 11.6517 21.4017C12.3549 20.6984 12.75 19.7446 12.75 18.75C12.75 17.7554 12.3549 16.8016 11.6517 16.0983C10.9484 15.3951 9.99456 15 9 15C8.00544 15 7.05161 15.3951 6.34835 16.0983C5.64509 16.8016 5.25 17.7554 5.25 18.75Z" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M12.75 18.75V1.5" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M12.75 2.86719L16.326 5.05119C18.765 6.93619 19.426 9.56219 18.026 11.8672" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const AUDIO_OFF_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_337_389)">
<path d="M6.37402 16.8419C6.37402 17.6556 6.69726 18.436 7.27262 19.0113C7.84798 19.5867 8.62834 19.9099 9.44202 19.9099C10.2557 19.9099 11.0361 19.5867 11.6114 19.0113C12.1868 18.436 12.51 17.6556 12.51 16.8419C12.51 16.0282 12.1868 15.2479 11.6114 14.6725C11.0361 14.0972 10.2557 13.7739 9.44202 13.7739C8.62834 13.7739 7.84798 14.0972 7.27262 14.6725C6.69726 15.2479 6.37402 16.0282 6.37402 16.8419Z" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M12.51 8.42004V4.18604C15.158 5.00404 17.491 6.32904 18.647 9.55504" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M0.749023 12C0.749023 14.9837 1.93429 17.8452 4.04407 19.955C6.15386 22.0647 9.01534 23.25 11.999 23.25C14.9827 23.25 17.8442 22.0647 19.954 19.955C22.0638 17.8452 23.249 14.9837 23.249 12C23.249 9.01631 22.0638 6.15483 19.954 4.04505C17.8442 1.93526 14.9827 0.75 11.999 0.75C9.01534 0.75 6.15386 1.93526 4.04407 4.04505C1.93429 6.15483 0.749023 9.01631 0.749023 12Z" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M4.04395 4.04492L19.9539 19.9549" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M12.51 16.8422V12.5112" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</g>
<defs>
<clipPath id="clip0_337_389">
<rect width="23.998" height="23.998" fill="white"/>
</clipPath>
</defs>
</svg>`;

export interface AudioToggleIconProps {
  enabled: boolean;
  onPress: () => void;
  size?: number;
}

export function AudioToggleIcon({ enabled, onPress, size = 24 }: AudioToggleIconProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={({ pressed }) => [styles.btn, { width: size, height: size }, pressed && styles.pressed]}
    >
      <SvgXml
        xml={enabled ? AUDIO_ON_SVG : AUDIO_OFF_SVG}
        width={size}
        height={size}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: { opacity: 0.6 },
});
