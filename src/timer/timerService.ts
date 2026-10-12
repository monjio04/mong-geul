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
  getDayRecord,
  saveDayRecord,
  resetMemos,
  incrementProgress,
  applyPendingProfile,
  getUserProfile,
} from '../storage/storage';
import type { TimerState, DayRecord, UserProfile } from '../storage/types';
import {
  scheduleCycle,
  ensureUpcomingCycles,
  cancelUpcomingCycles,
  cancelCyclesAfter,
  cancelLegacyCycleNotifications,
  getCycleNotifIds,
  cancelCycleNotifications,
  cancelNotifications,
  type ScheduledIds,
} from '../notifications/scheduler';
import {
  getAlarmDateString,
  getNextPrimaryAlarm,
  getNextCycleStart,
  getCurrentCyclePrimary,
  getLockTime,
} from './worryTimeWindow';
import type { WorryTime } from './worryTimeWindow';
import { pickFlowerType, pickFlowerPosition } from './flowerCycle';
import { setNfcSession } from '../audio/frog';

const NO_IDS: ScheduledIds = { primaryNotifId: null, secondaryNotifId: null, lockNotifId: null };

const sameTime = (a: WorryTime, b: WorryTime) => a.hour === b.hour && a.minute === b.minute;

/**
 * 이번 사이클이 끝난 뒤 다음 사이클 알림을 맞춰 둠.
 *  - 알림 꺼져 있으면 아무것도 예약하지 않음
 *  - pending 으로 걱정타임 시각이 바뀌었으면 옛 시각으로 미리 예약된 알림을 지우고 새로 예약
 *  - 다음 사이클부터 UPCOMING_CYCLE_DAYS 일치가 채워져 있도록 보충
 * 반환: 다음 사이클의 1차/2차 알림 id
 */
async function scheduleFromNextCycle(
  profile: UserProfile | null,
  prevWorryTime: WorryTime,
  nextCycleStart: Date,
): Promise<ScheduledIds> {
  if (!profile || !profile.notificationsEnabled) return NO_IDS;
  if (!sameTime(profile.worryTime, prevWorryTime)) await cancelUpcomingCycles();
  await ensureUpcomingCycles(getNextPrimaryAlarm(nextCycleStart, profile.worryTime));
  return scheduleCycle(profile.worryTime, nextCycleStart);
}

function addDaysToDateString(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return getAlarmDateString(new Date(y, m - 1, d + days));
}

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
  flowerType?: 1 | 2 | 3 | 4 | 5 | 6 | 7; // flower 시에만
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

  // 1. 기록 저장 — 꽃이면 flowerType(7개 사이클) 추첨, 새싹이면 type 없음
  // 위치는 alarmDate(YYYY-MM-DD) 기반 deterministic — month seed로 day마다 다른 slot
  //
  // fallback (state.alarmDate 가 null — 첫 사이클 등): 현재 사이클의 1차 알림 시각 사용.
  // 이전엔 getNextPrimaryAlarm 으로 "다음" 알림 시각을 잡아 worryTime 이 이미 지난 시점에
  // 다음 날 date 로 기록 → 다음 사이클이 같은 키 덮어쓰면서 기록 소실 버그가 있었음.
  const alarmDate = state.alarmDate ?? getAlarmDateString(getCurrentCyclePrimary(now, worryTime));
  const flowerType = status === 'flower' ? await pickFlowerType() : undefined;
  // 'YYYY-MM-DD' 파싱 (로컬 타임존 자정 기준)
  const [yy, mm, dd] = alarmDate.split('-').map(Number);
  const position = pickFlowerPosition(new Date(yy, mm - 1, dd));
  const record: DayRecord = {
    status,
    completedAt: now.toISOString(),
    isDelayed,
    isAdvanced,
    flowerType,
    position,
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

  // 5. pending 설정 적용 (다음 사이클부터 새 값) → 알림 예약
  //    사용자가 설정 화면에서 변경한 worryTime/focusMinutes가 pending에 저장되어 있다면
  //    여기서 active로 promote. 다음 cycle 알람은 새 값으로 schedule됨.
  //    fromTime = "이번 cycle 의 primary 기준" 다음 cycle 시작점 → stale 완료
  //    (어제 미완료 → 오늘 늦게 완료 케이스) 에서도 정확히 다음 날 알람을 잡음.
  //    이전엔 getNextCycleStart(now) 였는데 now 가 이미 다음 cycle 에 있으면
  //    그 다음 cycle 로 건너뛰는 버그 (day 2 가 통째로 사라짐) 가 있었음.
  const appliedProfile = await applyPendingProfile();
  const effectiveWorryTime = appliedProfile?.worryTime ?? worryTime;
  const [cyy, cmm, cdd] = alarmDate.split('-').map(Number);
  const currentCyclePrimary = new Date(cyy, cmm - 1, cdd, worryTime.hour, worryTime.minute);
  const nextCycleStart = getNextCycleStart(currentCyclePrimary);
  const { primaryNotifId, secondaryNotifId, lockNotifId } =
    await scheduleFromNextCycle(appliedProfile, worryTime, nextCycleStart);

  // 5-1. NFC 세션 reset — 다음 세션은 다시 일반 진입으로 시작 (개구리 음원 안 남)
  await setNfcSession(false);

  // 6. 타이머 상태 리셋 (잠금 상태로 설정)
  const nextPrimary = getNextPrimaryAlarm(nextCycleStart, effectiveWorryTime);
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

  return { status, flowerType, weeklyTriggered };
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

  // pending 설정 적용 + 다음 cycle 알림 예약 (completeTimer 동일)
  // fromTime = "이번 cycle 의 primary 기준" 다음 cycle 시작점.
  // (stale lock 케이스 — 어제 미완료 → 오늘 자동 잠금 — 에서도 정확히 다음 날 알람 스케줄)
  const appliedProfile = await applyPendingProfile();
  const effectiveWorryTime = appliedProfile?.worryTime ?? worryTime;
  const [cyy, cmm, cdd] = alarmDate.split('-').map(Number);
  const currentCyclePrimary = new Date(cyy, cmm - 1, cdd, worryTime.hour, worryTime.minute);
  const nextCycleStart = getNextCycleStart(currentCyclePrimary);

  // NFC 세션 reset — 잠금 시점에도 다음 세션은 일반 진입으로 시작
  await setNfcSession(false);
  const { primaryNotifId, secondaryNotifId, lockNotifId } =
    await scheduleFromNextCycle(appliedProfile, worryTime, nextCycleStart);

  const nextPrimary = getNextPrimaryAlarm(nextCycleStart, effectiveWorryTime);
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

// ─── 앱 시작 시 stale 세션 복구 ──────────────────────────

/**
 * 앱 시작 시 호출. 미완료 세션이 lockTime 을 넘긴 채 남아있으면 자동 잠금.
 *
 * 케이스 1: 사용자가 걱정타임 시작했다가 작성 완료 안 누르고 이탈 → 같은 날 늦게 진입
 *          (예: 14시 시작, 20시 진입) → cycle 의 lockTime(=primary+90분, 15:30) 이미 지남.
 * 케이스 2: 이탈 후 다음날 진입 → 더더욱 지남.
 *
 * 판정: startedAt 이 속한 cycle 의 lockTime 보다 now 가 늦으면 stale → lock.
 *       lockTime 이내면 사용자가 아직 작성 중 — 정상 진행.
 */
export async function recoverStaleSessionIfNeeded(): Promise<void> {
  const state = await getTimerState();
  if (!state.startedAt || state.isLocked) return;

  const profile = await getUserProfile();
  if (!profile) return;

  // startedAt 이 속한 cycle 의 primary → lockTime 계산
  const startedAt = new Date(state.startedAt);
  const startedCyclePrimary = getCurrentCyclePrimary(startedAt, profile.worryTime);
  const startedCycleLock = getLockTime(startedCyclePrimary);
  const now = new Date();

  if (now <= startedCycleLock) return; // 아직 cycle 안 — 정상 진행 (resume 가능)

  // Stale — startedAt 의 cycle 자동 잠금 (빈자리 기록 + 다음 알람 예약)
  if (state.alarmDate) {
    console.log(
      '[recoverStaleSession] locking stale cycle:',
      state.alarmDate,
      '(lockTime was', startedCycleLock.toLocaleString(), ')',
    );
    await lockCycle(state.alarmDate, profile.worryTime);
  }
}

// ─── 앱 진입 시 사이클 동기화 ──────────────────────────────

let syncing: Promise<void> | null = null;

/**
 * 앱 시작 / 포그라운드 복귀 / 알림 탭 시 호출. 여러 번 불려도 안전 (동시 호출은 하나로 합침).
 *
 * 1) 시작만 하고 안 끝낸 세션 정리 (recoverStaleSessionIfNeeded)
 * 2) 저장된 사이클(alarmDate)이 지금 사이클보다 과거 = 앱을 열지 않은 채 지나간 날이 있음
 *    → 기록 없는 날은 빈자리로 기록, pending 설정 적용, 지금 사이클 기준으로 상태 초기화
 * 3) 앞으로 UPCOMING_CYCLE_DAYS 일치 알림 보충
 */
export function syncCycle(): Promise<void> {
  if (!syncing) {
    syncing = runSyncCycle()
      .catch((e) => console.error('[syncCycle] 실패:', e))
      .finally(() => {
        syncing = null;
      });
  }
  return syncing;
}

async function runSyncCycle(): Promise<void> {
  await recoverStaleSessionIfNeeded();

  let profile = await getUserProfile();
  if (!profile) return; // 온보딩 전
  const original = await getTimerState();
  let state = original;
  const now = new Date();

  await cancelLegacyCycleNotifications();

  let curDate = getAlarmDateString(getCurrentCyclePrimary(now, profile.worryTime));
  if (!state.alarmDate) state = { ...state, alarmDate: curDate };

  if (state.alarmDate! < curDate) {
    // 지나간 사이클 중 기록이 없는 날 = 놓친 날 → 빈자리
    let date = state.alarmDate!;
    let isFirst = true;
    while (date < curDate) {
      if (!(await getDayRecord(date))) {
        await saveDayRecord(date, {
          status: 'empty',
          completedAt: null,
          isDelayed: isFirst && state.isDelayed,
          isAdvanced: false,
        });
      }
      date = addDaysToDateString(date, 1);
      isFirst = false;
    }

    // 사이클이 바뀌었으니 pending 설정 적용 (completeTimer / lockCycle 과 동일)
    const prevWorryTime = profile.worryTime;
    profile = (await applyPendingProfile()) ?? profile;
    if (!sameTime(profile.worryTime, prevWorryTime)) await cancelUpcomingCycles();
    curDate = getAlarmDateString(getCurrentCyclePrimary(now, profile.worryTime));

    if (state.startedAt) {
      // 지금 사이클에 시작한 세션 — 진행 상태는 그대로 두고 날짜만 맞춤
      state = { ...state, alarmDate: curDate };
    } else {
      await setNfcSession(false);
      state = {
        isLocked: false,
        lockedAt: null,
        alarmDate: curDate,
        isDelayed: false,
        isAdvanced: false,
        delayedUntil: null,
        startedAt: null,
        primaryNotifId: null,
        secondaryNotifId: null,
        lockNotifId: null,
        timerEndNotifId: null,
      };
    }
  }

  if (profile.notificationsEnabled) {
    // 오늘 사이클이 아직 열려 있으면 오늘부터, 이미 끝났거나 진행/미루기 중이면 내일부터 채움
    const curPrimary = getCurrentCyclePrimary(now, profile.worryTime);
    const lockedThisCycle =
      state.isLocked &&
      state.lockedAt !== null &&
      getAlarmDateString(getCurrentCyclePrimary(new Date(state.lockedAt), profile.worryTime)) === curDate;
    const todayOpen =
      state.alarmDate === curDate && !lockedThisCycle && !state.isDelayed && !state.startedAt;
    const firstPrimary = new Date(curPrimary);
    if (!todayOpen) firstPrimary.setDate(firstPrimary.getDate() + 1);
    await ensureUpcomingCycles(firstPrimary);
  }

  // 미루기 중(primaryNotifId 에 미루기 알림 id) / 진행 중이 아니면, 저장된 id 를 실제 예약과 맞춤
  if (!state.isDelayed && !state.startedAt) {
    const ids = await getCycleNotifIds(state.alarmDate!);
    state = { ...state, primaryNotifId: ids.primaryNotifId, secondaryNotifId: ids.secondaryNotifId };
  }

  if (JSON.stringify(state) !== JSON.stringify(original)) {
    await saveTimerState(state);
  }
}

/**
 * 설정에서 걱정타임 시각을 pending 으로 바꿨을 때 (오늘 사이클이 아직 안 끝남).
 * 오늘 알림은 그대로 두고, 내일 사이클부터 미리 예약된 알림을 새 시각으로 교체.
 * (pending 은 사이클이 끝날 때 적용되는데, 오늘을 놓치면 그 전에 내일 알림이 옛 시각으로 울리므로)
 */
export async function reschedulePendingWorryTime(pendingWorryTime: WorryTime): Promise<void> {
  const profile = await getUserProfile();
  if (!profile || !profile.notificationsEnabled) return;
  const curPrimary = getCurrentCyclePrimary(new Date(), profile.worryTime);
  await cancelCyclesAfter(getAlarmDateString(curPrimary));
  await ensureUpcomingCycles(getNextPrimaryAlarm(getNextCycleStart(curPrimary), pendingWorryTime));
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
  // 미리 쓰기 시작 → 이번 사이클의 worryTime 알림 모두 취소 (1차/2차/잠금)
  // (작성 도중에 worryTime 도달 시 불필요한 알림 방지)
  await cancelCycleNotifications({
    primaryNotifId: state.primaryNotifId,
    secondaryNotifId: state.secondaryNotifId,
    lockNotifId: state.lockNotifId,
    timerEndNotifId: state.timerEndNotifId,
  });
  await saveTimerState({
    ...state,
    isAdvanced: true,
    startedAt: new Date().toISOString(),
    // 새 사이클 시작 → 이전 사이클의 lock 해제
    isLocked: false,
    lockedAt: null,
    // notif ID reset (cancel 됐으니)
    primaryNotifId: null,
    secondaryNotifId: null,
    lockNotifId: null,
    timerEndNotifId: null,
  });
}
