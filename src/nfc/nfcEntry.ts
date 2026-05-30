/**
 * NFC 진입 단일 handler
 *
 * 호출 시점:
 *   - 앱 포그라운드 + NFC 태그: App.tsx 의 NfcManager listener
 *   - 앱 백그라운드/종료 + NFC 태그: Linking deep link (`https://worrytime.app/start`)
 *
 * 동작 — handleNotificationResponse 와 동일 패턴:
 *   1) 사이클 종료 (locked/completed/missed) → WorryTimeEnded 모달 (Home + showWorryEnded)
 *   2) 미루기 대기 (delayed) → 토스트 안내 + 홈 유지
 *   3) 걱정타임 진행 (active/inProgress/advanced) → NFC 세션 표시 + 🐸 시작 + WorryTimeEntry
 *   4) idle (걱정타임 전) → NotWorryTime 시트 (앞당기기 선택)
 */

import { resolveState, hasTodayCycleEnded } from '../timer/stateMachine';
import { getUserProfile, getTimerState } from '../storage/storage';
import { setNfcSession } from '../audio/frog';
import { emitGlobalToast } from '../components/GlobalToast';
import { navigationRef } from '../../App';

// "오후 03:00 에 다시 만나요" 형태로 포맷
function formatDelayedMessage(delayedUntil: string | null): string {
  if (!delayedUntil) return '미루기 시간 후에 다시 올려주세요';
  const d = new Date(delayedUntil);
  const h24 = d.getHours();
  const isAM = h24 < 12;
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  const hh = String(h12).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${isAM ? '오전' : '오후'} ${hh}:${mm}에 다시 만나요`;
}

/**
 * NFC 태그 인식 시 호출되는 단일 entry point.
 * - foreground / background / killed 모든 진입 경로가 이 함수로 수렴.
 */
export async function handleNfcTagEntry(): Promise<void> {
  if (!navigationRef.isReady()) return;

  try {
    const profile = await getUserProfile();
    if (!profile) return; // 온보딩 전이면 무시
    const timerState = await getTimerState();
    const now = new Date();
    const state = resolveState(timerState, now, profile.worryTime);

    if (__DEV__) {
      console.log('[NFC] tag detected — state=', state);
    }

    // 1) 사이클 종료 — WorryTimeEnded 모달 (재사용)
    if (hasTodayCycleEnded(state, now, profile.worryTime)) {
      navigationRef.navigate('Home', { showWorryEnded: true });
      return;
    }

    // 2) 미루기 대기 — 토스트 + 홈 유지
    if (state === 'delayed') {
      emitGlobalToast(formatDelayedMessage(timerState.delayedUntil));
      // 홈에 있지 않을 수 있으니 홈으로 (선택)
      navigationRef.navigate('Home');
      return;
    }

    // 3) 걱정타임 진행 — NFC 세션 표시만 + WorryTimeEntry
    //   🐸 시작 음원은 WorryTimeScreen 마운트 시점에 재생 (진입/전환 화면이 아닌 본화면에서)
    if (state === 'active' || state === 'inProgress' || state === 'advanced') {
      await setNfcSession(true);
      navigationRef.navigate('WorryTimeEntry');
      return;
    }

    // 4) idle — NotWorryTime 시트 (기존 재사용 — "지금 작성할래요" → 앞당기기)
    //    fromNfc:true 로 알려서, 시트의 "지금 작성할래요" 핸들러가 NFC 세션 켜도록
    navigationRef.navigate('NotWorryTime', { fromNfc: true });
  } catch (e) {
    console.warn('[NFC] handleNfcTagEntry error:', e);
    // 오류 시 안전하게 홈으로
    navigationRef.navigate('Home');
  }
}
