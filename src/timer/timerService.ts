/**
 * 타이머 서비스
 *
 * 핵심 전략:
 * - startedAt만 저장 → 복귀 시 now - startedAt으로 경과 시간 계산
 * - 타이머 종료 시각을 OS 알림으로 예약 → 앱이 꺼져도 발화
 * - 완료 처리 경로:
 *   (a) 포그라운드: 타이머 만료 시 즉시 처리
 *   (b) 백그라운드/종료: 알림 탭 → 진입 시 처리
 *   (c) 알림 무시 후 진입: startedAt + focusMinutes < now → 자동 처리
 */

import {
  getTimerState,
  saveTimerState,
  resetTimerState,
  saveDayRecord,
  resetMemos,
  incrementProgress,
} from '../storage/storage';
import type { TimerState, DayRecord } from '../storage/types';
import {
  scheduleCycle,
  cancelCycleNotifications,
  cancelNotifications,
} from '../notifications/scheduler';
import { getAlarmDateString, getNextPrimaryAlarm } from './worryTimeWindow';
import type { WorryTime } from './worryTimeWindow';

// ─── 타이머 시작 ─────────────────────────────────────────

export async function startTimer(_focusMinutes: number): Promise<void> {
  // 사용자 결정: 타이머 종료 알림(TIMER_END) 제거.
  // startedAt만 기록 — 앱 안에서 elapsed 계산만 사용.
  const now = new Date();
  const state = await getTimerState();

  await saveTimerState({
    ...state,
    startedAt: now.toISOString(),
    timerEndNotifId: null, // 호환성 필드, 더 이상 사용 X
  });
}

// ─── 남은 시간 계산 ────────────────────────────────────────

export function getRemainingSeconds(startedAt: string, focusMinutes: number): number {
  const start = new Date(startedAt).getTime();
  const end = start + focusMinutes * 60 * 1000;
  const remaining = Math.floor((end - Date.now()) / 1000);
  return Math.max(0, remaining);
}

export function isTimerExpired(startedAt: string, focusMinutes: number): boolean {
  return getRemainingSeconds(startedAt, focusMinutes) === 0;
}

// ─── 타이머 완료 처리 ─────────────────────────────────────

export interface CompleteResult {
  status: 'flower' | 'sprout';
  weeklyTriggered: boolean;
}

/**
 * 걱정 타임 완료
 * - isDelayed/isAdvanced에 따라 꽃/새싹 결정
 * - 알림 정리
 * - 메모 리셋 (다음 사이클까지 새 메모)
 * - 카운터 +1
 * - 다음 사이클 알림 예약
 */
export async function completeTimer(
  worryTime: WorryTime
): Promise<CompleteResult> {
  const state = await getTimerState();
  const now = new Date();

  const isDelayed = state.isDelayed;
  const isAdvanced = state.isAdvanced;
  const status: 'flower' | 'sprout' =
    isDelayed || isAdvanced ? 'sprout' : 'flower';

  // 1. 기록 저장
  const alarmDate = state.alarmDate ?? getAlarmDateString(getNextPrimaryAlarm(now, worryTime));
  const record: DayRecord = {
    status,
    completedAt: now.toISOString(),
    isDelayed,
    isAdvanced,
  };
  await saveDayRecord(alarmDate, record);

  // 2. 이번 사이클 알림 모두 취소
  await cancelCycleNotifications({
    primaryNotifId: state.primaryNotifId,
    secondaryNotifId: state.secondaryNotifId,
    lockNotifId: state.lockNotifId,
    timerEndNotifId: state.timerEndNotifId,
  });

  // 3. 메모 리셋
  await resetMemos();

  // 4. 카운터 +1
  const { triggered: weeklyTriggered } = await incrementProgress();

  // 5. 다음 사이클 알림 예약
  const { primaryNotifId, secondaryNotifId, lockNotifId } =
    await scheduleCycle(worryTime);

  // 6. 타이머 상태 리셋 (잠금 상태로 설정)
  const nextPrimary = getNextPrimaryAlarm(now, worryTime);
  const nextAlarmDate = getAlarmDateString(nextPrimary);

  await saveTimerState({
    isLocked: true,
    lockedAt: now.toISOString(),
    alarmDate: nextAlarmDate,
    isDelayed: false,
    isAdvanced: false,
    delayedUntil: null,
    startedAt: null,
    primaryNotifId,
    secondaryNotifId,
    lockNotifId,
    timerEndNotifId: null,
  });

  return { status, weeklyTriggered };
}

// ─── 잠금 처리 (미완료) ───────────────────────────────────

/**
 * 시간 초과로 인한 잠금
 * - 빈자리 기록
 * - 메모 리셋
 * - 다음 사이클 예약
 */
export async function lockCycle(
  alarmDate: string,
  worryTime: WorryTime
): Promise<void> {
  const state = await getTimerState();
  const now = new Date();

  // 빈자리 기록
  const record: DayRecord = {
    status: 'empty',
    completedAt: null,
    isDelayed: state.isDelayed,
    isAdvanced: false,
  };
  await saveDayRecord(alarmDate, record);

  // 알림 정리
  await cancelCycleNotifications({
    primaryNotifId: state.primaryNotifId,
    secondaryNotifId: state.secondaryNotifId,
    lockNotifId: state.lockNotifId,
    timerEndNotifId: state.timerEndNotifId,
  });

  // 메모 리셋
  await resetMemos();

  // 다음 사이클 예약
  const { primaryNotifId, secondaryNotifId, lockNotifId } =
    await scheduleCycle(worryTime);

  const nextPrimary = getNextPrimaryAlarm(now, worryTime);
  const nextAlarmDate = getAlarmDateString(nextPrimary);

  await saveTimerState({
    isLocked: true,
    lockedAt: now.toISOString(),
    alarmDate: nextAlarmDate,
    isDelayed: false,
    isAdvanced: false,
    delayedUntil: null,
    startedAt: null,
    primaryNotifId,
    secondaryNotifId,
    lockNotifId,
    timerEndNotifId: null,
  });
}

// ─── 미루기 처리 ─────────────────────────────────────────

import { scheduleDelayed } from '../notifications/scheduler';

export async function applyDelay(delayedUntil: Date): Promise<void> {
  const state = await getTimerState();

  // 1. 기존 사이클 알림 모두 취소 (미루기 재알림이 대체)
  //    - primaryNotifId: 이미 발화됐을 수도 있지만 안전하게 취소
  //    - secondaryNotifId: 30분 후 2차 알림 (미루기 선택 시 불필요)
  //    - lockNotifId: 원래 잠금 트리거 (미루기 잠금으로 대체)
  await cancelNotifications([
    state.primaryNotifId,
    state.secondaryNotifId,
    state.lockNotifId,
  ]);

  // 2. 미루기 재알림 + 미루기 잠금 예약
  const { delayedNotifId, delayLockNotifId } = await scheduleDelayed(delayedUntil);

  // 3. 상태 업데이트
  //    delayedNotifId는 primaryNotifId 슬롯을 재사용 (의미: 다음 발화 알림 ID)
  await saveTimerState({
    ...state,
    isDelayed: true,
    delayedUntil: delayedUntil.toISOString(),
    primaryNotifId: delayedNotifId,
    secondaryNotifId: null,            // 취소됨
    lockNotifId: delayLockNotifId,     // 미루기 잠금으로 교체
  });
}

// ─── 앞당기기 처리 ────────────────────────────────────────

export async function startAdvanced(): Promise<void> {
  const state = await getTimerState();
  await saveTimerState({
    ...state,
    isAdvanced: true,
    startedAt: new Date().toISOString(),
  });
}
