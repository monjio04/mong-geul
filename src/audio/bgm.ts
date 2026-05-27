/**
 * BGM 모듈 — 걱정타임 동안 BGM 재생/정지 관리
 *
 * 자산 (assets/bgm/):
 *   - rain.mp3  : 우산 위에 떨어지는 빗소리
 *   - waves.mp3 : 파도 화이트노이즈
 *
 * 세션 개념:
 *   한 번의 걱정타임이 = 하나의 BGM 세션. 세션 시작 시 트랙 1개를 랜덤으로 "선택"
 *   하고, 세션 끝까지 그 트랙을 유지한다. 사용자가 audio 토글로 껐다 켜도 같은 트랙.
 *
 * API:
 *   - playBgm()          → 선택된 트랙 무한 반복 재생 (없으면 랜덤 선택 후 재생)
 *   - stopBgm()          → 재생 정지 + 메모리 해제 (트랙 선택은 유지)
 *   - resetBgmSession()  → 정지 + 트랙 선택 초기화 (다음 playBgm 호출 시 새 랜덤)
 *
 * iOS 사일런트 모드 대응:
 *   - playsInSilentModeIOS: true 로 설정 → 무음 스위치 ON 일 때도 재생
 *
 * 사용처: WorryTimeScreen (걱정타임 진행 중)
 *   - mount + audioEnabled === true → playBgm()
 *   - audioEnabled toggle off       → stopBgm()  (트랙 유지)
 *   - audioEnabled toggle on        → playBgm()  (같은 트랙 재개)
 *   - 화면 unmount / 타이머 종료    → resetBgmSession() (다음 세션 위해 초기화)
 */

import { Audio, type AVPlaybackSource } from 'expo-av';

const BGM_TRACKS: AVPlaybackSource[] = [
  require('../../assets/bgm/rain.mp3'),
  require('../../assets/bgm/waves.mp3'),
];

// 동시 재생 방지를 위한 모듈 레벨 단일 인스턴스
let currentSound: Audio.Sound | null = null;
let currentLoadToken = 0; // 비동기 race condition 방지용

// 현재 세션에서 선택된 트랙 index — null 이면 다음 playBgm 시 새로 랜덤 선택
let selectedTrackIndex: number | null = null;

/**
 * BGM 재생.
 *   - 세션에 선택된 트랙이 있으면 그것을 재생
 *   - 없으면 랜덤으로 1개 선택해서 세션 트랙으로 저장 후 재생
 * 이미 재생 중이면 정지 후 새로 시작 (동일 트랙 from start).
 */
export async function playBgm(): Promise<void> {
  // 이전 재생이 있다면 정리
  await stopBgm();

  // 세션 트랙 미선택 시 랜덤 선택 (이후 stopBgm 으로 정지해도 유지됨)
  if (selectedTrackIndex === null) {
    selectedTrackIndex = Math.floor(Math.random() * BGM_TRACKS.length);
  }

  const token = ++currentLoadToken;
  const trackIndex = selectedTrackIndex;

  try {
    // iOS 사일런트 모드에서도 재생되게 audio session 설정
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    const source = BGM_TRACKS[trackIndex];
    const { sound } = await Audio.Sound.createAsync(source, {
      isLooping: true,
      shouldPlay: true,
      volume: 0.7, // 너무 크지 않게 — 글쓰기 방해 X
    });

    // 로드 중 stopBgm/resetBgmSession 호출됐으면 즉시 정리
    if (token !== currentLoadToken) {
      await sound.unloadAsync();
      return;
    }

    currentSound = sound;
  } catch (e) {
    console.warn('[bgm] playBgm 실패:', e);
  }
}

/**
 * @deprecated 이전 API 호환 — 내부적으로 playBgm() 호출.
 * (한 세션 내에서는 동일 트랙 유지되므로 이름과 동작이 다름. playBgm 사용 권장.)
 */
export const playRandomBgm = playBgm;

/**
 * 현재 재생 중인 BGM 정지 + 메모리 해제.
 * 트랙 선택은 유지 — 다음 playBgm() 호출 시 같은 트랙 재생.
 */
export async function stopBgm(): Promise<void> {
  currentLoadToken++; // 진행 중인 load 무효화
  const sound = currentSound;
  currentSound = null;

  if (!sound) return;
  try {
    await sound.stopAsync();
    await sound.unloadAsync();
  } catch (e) {
    // 이미 unload 된 경우 등 무시
    console.warn('[bgm] stopBgm 정리 중 경고 (무시 가능):', e);
  }
}

/**
 * BGM 세션 종료 — 정지 + 트랙 선택 초기화.
 * 다음 playBgm() 호출 시 새 랜덤 트랙 선택됨.
 * 호출 시점: 걱정타임 종료, WorryTimeScreen unmount 등.
 */
export async function resetBgmSession(): Promise<void> {
  selectedTrackIndex = null;
  await stopBgm();
}

/**
 * 현재 재생 상태 — 디버그용
 */
export function isBgmPlaying(): boolean {
  return currentSound !== null;
}
