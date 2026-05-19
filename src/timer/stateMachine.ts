/**
 * 걱정 타임 상태 머신
 *
 * 상태:
 *   idle      — 걱정 타임 시간 아님, 잠금도 없음
 *   active    — 걱정 타임 시간 도달, 아직 시작 안 함
 *   inProgress — 타이머 진행 중
 *   delayed   — 미루기 선택 후 재알림 대기 중
 *   advanced  — 앞당기기 진행 중 (걱정 타임 전 자발적 작성)
 *   locked    — 이번 사이클 잠금 (미완료 or 완료 후)
 *   completed — 이번 사이클 정상 완료 (= locked와 같지만 완료 플래그)
 */

import type { TimerState, WorkerState } from '../storage/types';
import type { WorryTime } from './worryTimeWindow';
import {
  getNextPrimaryAlarm,
  getLockTime,
  getDelayLockTime,
  isInWorryWindow,
  isBeforeWorryTime,
} from './worryTimeWindow';

// ─── 상태 판단 ────────────────────────────────────────────

/**
 * 앱 진입 시 현재 상태를 계산해서 반환
 * AsyncStorage에서 읽은 timerState + 현재 시각 + 설정 시각으로 판단
 */
export function resolveState(
  timerState: TimerState,
  now: Date,
  worryTime: WorryTime
): WorkerState {
  // 1. 타이머 진행 중
  if (timerState.startedAt && !timerState.isLocked) {
    const startedAt = new Date(timerState.startedAt);
    // 타이머 끝났는지 체크는 timerService에서 처리
    return 'inProgress';
  }

  // 2. 앞당기기 진행 중
  if (timerState.isAdvanced && timerState.startedAt && !timerState.isLocked) {
    return 'advanced';
  }

  // 3. 잠금 상태
  if (timerState.isLocked) {
    // 다음 1차 알림이 왔으면 자동 해제 (새 사이클)
    const nextPrimary = getNextPrimaryAlarm(now, worryTime);
    const lockedAt = timerState.lockedAt ? new Date(timerState.lockedAt) : null;

    if (lockedAt && nextPrimary > lockedAt && now >= nextPrimary) {
      // 다음 사이클이 시작됐으므로 해제
      return 'active';
    }
    return 'locked';
  }

  // 4. 미루기 대기 중
  if (timerState.isDelayed && timerState.delayedUntil) {
    const delayedUntil = new Date(timerState.delayedUntil);
    const delayLock = getDelayLockTime(delayedUntil);

    if (now >= delayLock) return 'locked'; // 미루기 시간도 지남 → 잠금
    if (now >= delayedUntil) return 'active'; // 미루기 알림 왔음 → 활성
    return 'delayed'; // 아직 대기 중
  }

  // 5. 걱정 타임 활성 여부 판단
  const primaryAlarm = getNextPrimaryAlarm(now, worryTime);
  const lockTime = getLockTime(primaryAlarm);
  const prevPrimary = new Date(primaryAlarm.getTime() - 24 * 60 * 60 * 1000);

  // 오늘 알림 시각이 이미 지났다면 prevPrimary 기준으로 체크
  if (isInWorryWindow(now, prevPrimary)) return 'active';
  if (isInWorryWindow(now, primaryAlarm)) return 'active';

  // 6. idle (걱정 타임 전)
  return 'idle';
}

// ─── 액션 타입 ────────────────────────────────────────────

export type TimerAction =
  | 'START_TIMER'      // 걱정 타임 시작 버튼
  | 'COMPLETE_TIMER'   // 타이머 완료
  | 'DELAY'            // 미루기 선택
  | 'DELAY_COMPLETE'   // 미루기 후 완료
  | 'ADVANCE_START'    // 앞당기기 시작
  | 'ADVANCE_COMPLETE' // 앞당기기 완료
  | 'LOCK'             // 잠금 트리거 (알림 또는 시간 초과)
  | 'UNLOCK';          // 새 사이클 시작으로 잠금 해제

/**
 * 상태 전이 규칙
 * 유효하지 않은 전이 → null 반환
 */
export function transition(
  action: TimerAction,
  currentState: WorkerState
): WorkerState | null {
  const rules: Record<TimerAction, WorkerState[]> = {
    START_TIMER:      ['active'],
    COMPLETE_TIMER:   ['inProgress'],
    DELAY:            ['active'],
    DELAY_COMPLETE:   ['delayed'],
    ADVANCE_START:    ['idle'],
    ADVANCE_COMPLETE: ['advanced'],
    LOCK:             ['active', 'delayed', 'idle'],
    UNLOCK:           ['locked', 'completed'],
  };

  const nextStateMap: Record<TimerAction, WorkerState> = {
    START_TIMER:      'inProgress',
    COMPLETE_TIMER:   'completed',
    DELAY:            'delayed',
    DELAY_COMPLETE:   'completed',
    ADVANCE_START:    'advanced',
    ADVANCE_COMPLETE: 'completed',
    LOCK:             'locked',
    UNLOCK:           'active',
  };

  if (!rules[action].includes(currentState)) {
    console.warn(`[stateMachine] 유효하지 않은 전이: ${currentState} + ${action}`);
    return null;
  }
  return nextStateMap[action];
}
