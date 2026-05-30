/**
 * 🐸 개구리 음원 + NFC 세션 추적 모듈
 *
 * 3가지 멘트 (NFC 진입 세션 전용 — 일반 진입은 무음):
 *  - playFrogStart : "준비해볼까요?"                       (NFC 태그 시점)
 *  - playFrog5min  : "남은 시간동안 천천히 생각해봐요"        (남은 시간 5분)
 *  - playFrogEnd   : "끝났어요. 고민을 내려놓아요"           (타이머 만료)
 *
 * NFC 세션 플래그:
 *  - handleNfcTagEntry 진입 시 setNfcSession(true)
 *  - completeTimer / lockCycle 종료 시 setNfcSession(false)
 *  - WorryTimeScreen 의 5분/끝 트리거가 isNfcSession() 체크해서 NFC 세션만 음원
 *
 * BGM 과 독립:
 *  - 사용자 profile.audioEnabled (BGM 토글) 와 무관 — 개구리는 항상 재생
 *  - expo-av 는 여러 Sound 동시 재생 지원 (BGM 루프 위에 개구리 멘트 겹쳐 재생 OK)
 *
 * 음원 파일 미존재 시 (디자이너 제작 대기):
 *  - require 경로의 파일 없으면 Metro 가 build 에러
 *  - 임시: require 라인 주석 처리 → asset = undefined → playSound 가 no-op
 *  - 파일 받으면 require 주석 해제 + 핫리로드 (리빌드 X)
 */

import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── 음원 자산 ─────────────────────────────────────────────
const FROG_START = require('../../assets/sounds/frog_start.mp3'); // "준비해볼까요?"
const FROG_5MIN  = require('../../assets/sounds/frog_5min.mp3');  // "남은 시간동안 천천히 생각해봐요"
const FROG_END   = require('../../assets/sounds/frog_end.mp3');   // "끝났어요. 고민을 내려놓아요"

// ─── NFC 세션 플래그 ───────────────────────────────────────

const NFC_SESSION_KEY = 'nfc_session';

/**
 * NFC 세션 표시
 *  - handleNfcTagEntry 의 active 분기에서 true 호출
 *  - completeTimer / lockCycle 종료 시 false 호출
 */
export async function setNfcSession(active: boolean): Promise<void> {
  try {
    if (active) {
      await AsyncStorage.setItem(NFC_SESSION_KEY, '1');
    } else {
      await AsyncStorage.removeItem(NFC_SESSION_KEY);
    }
  } catch (e) {
    console.warn('[frog] setNfcSession failed:', e);
  }
}

/**
 * 현재 세션이 NFC 진입인지
 *  - WorryTimeScreen 의 5분/끝 트리거가 호출
 *  - true 면 개구리 음원 재생, false 면 무음
 */
export async function isNfcSession(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(NFC_SESSION_KEY)) === '1';
  } catch {
    return false;
  }
}

// ─── 음원 재생 헬퍼 ────────────────────────────────────────

// 음원이 끝나는 시점에 resolve 되는 Promise 반환 (호출자가 await 해서 다음 액션 순차화 가능).
// 음원 파일 미준비 / 로드 실패 시엔 즉시 resolve — caller 흐름은 항상 진행.
async function playSound(asset: unknown): Promise<void> {
  if (!asset) return; // 음원 파일 미준비 (require 주석) → no-op
  return new Promise<void>((resolve) => {
    Audio.Sound.createAsync(asset as never)
      .then(({ sound }) => {
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync().catch(() => {});
            resolve();
          }
        });
        sound.playAsync().catch((e) => {
          console.warn('[frog] play failed:', e);
          resolve();
        });
      })
      .catch((e) => {
        console.warn('[frog] create failed:', e);
        resolve();
      });
  });
}

export const playFrogStart = (): Promise<void> => playSound(FROG_START);
export const playFrog5min  = (): Promise<void> => playSound(FROG_5MIN);
export const playFrogEnd   = (): Promise<void> => playSound(FROG_END);
