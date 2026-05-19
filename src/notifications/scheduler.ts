/**
 * 알림 스케줄링 모듈
 *
 * 알림 구조 (1사이클):
 *   [A] 1차 알림 — 설정 시각 (걱정 타임 활성화)
 *   [B] 2차 알림 — 1차 + 30분 (미루기 안내 포함)
 *   [C] 잠금 트리거 — 2차 + 1시간 (앱이 꺼져도 발화)
 *   [D] 타이머 종료 — 타이머 시작 시 별도 예약
 *
 * 미루기 추가 알림:
 *   [E] 재알림 — 사용자 지정 시각
 *   [F] 미루기 잠금 — 재알림 + 30분
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  getNextPrimaryAlarm,
  getSecondaryAlarmTime,
  getLockTime,
  getDelayLockTime,
  type WorryTime,
} from '../timer/worryTimeWindow';

// ─── Android 알림 채널 ─────────────────────────────────────
// HIGH importance → Doze 모드(폰 잠금/유휴 상태)에서도 정시 발화 시도
// LOW/DEFAULT importance면 Doze 모드에 묶여서 지연 발생

const CHANNEL_ID = 'worry-time-alarm';

export async function setupAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: '걱정 타임 알림',
    description: '걱정 타임 시작/유예/잠금 알림',
    importance: Notifications.AndroidImportance.HIGH,  // ← Doze 우회 핵심
    enableVibrate: true,
    vibrationPattern: [0, 250, 250, 250],
    sound: 'default',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: false,
    showBadge: false,
  });
}

// ─── 알림 핸들러 초기화 ────────────────────────────────────

export function initNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * 앱 시작 시 한 번 호출 — 핸들러 + Android 채널 동시 셋업
 */
export async function initNotifications(): Promise<void> {
  initNotificationHandler();
  await setupAndroidChannel();
}

// ─── 알림 식별자 (data 필드로 구분) ────────────────────────

export const NOTIF_TYPE = {
  PRIMARY: 'worry_primary',
  SECONDARY: 'worry_secondary',
  LOCK: 'worry_lock',
  TIMER_END: 'timer_end',
  DELAYED: 'worry_delayed',
  DELAY_LOCK: 'worry_delay_lock',
} as const;

// ─── 1사이클 예약 ─────────────────────────────────────────

export interface ScheduledIds {
  primaryNotifId: string | null;
  secondaryNotifId: string | null;
  lockNotifId: string | null;
}

/**
 * 걱정 타임 1사이클 알림 3개 예약
 * 완료/잠금 시 cancelCycleNotifications()로 일괄 취소
 */
export async function scheduleCycle(worryTime: WorryTime): Promise<ScheduledIds> {
  const now = new Date();
  const primaryAlarm = getNextPrimaryAlarm(now, worryTime);
  const secondaryAlarm = getSecondaryAlarmTime(primaryAlarm);
  const lockTrigger = getLockTime(primaryAlarm);

  // 04:00 설정 시 2차 알림/잠금 여전히 예약 (미루기만 제외)
  const [primaryId, secondaryId, lockId] = await Promise.all([
    scheduleAt(primaryAlarm, {
      title: '걱정 타임이에요 📓',
      body: '지금 걱정을 꺼내볼 시간이에요.',
      data: { type: NOTIF_TYPE.PRIMARY as string },
    }),
    scheduleAt(secondaryAlarm, {
      title: '아직 걱정 타임이 남아있어요',
      body: '바로 못 하셨다면 지금 시작하거나 미룰 수 있어요.',
      data: { type: NOTIF_TYPE.SECONDARY as string },
    }),
    scheduleAt(lockTrigger, {
      title: '오늘의 걱정 타임이 지나갔어요',
      body: '내일 또 만나요. 오늘 하루도 수고하셨어요.',
      data: { type: NOTIF_TYPE.LOCK as string },
    }),
  ]);

  return {
    primaryNotifId: primaryId,
    secondaryNotifId: secondaryId,
    lockNotifId: lockId,
  };
}

// ─── 미루기 알림 ─────────────────────────────────────────

export interface DelayScheduledIds {
  delayedNotifId: string | null;
  delayLockNotifId: string | null;
}

export async function scheduleDelayed(delayedUntil: Date): Promise<DelayScheduledIds> {
  const delayLock = getDelayLockTime(delayedUntil);

  const [delayedId, delayLockId] = await Promise.all([
    scheduleAt(delayedUntil, {
      title: '미뤄둔 걱정 타임이에요 📓',
      body: '지금 걱정을 꺼내볼 시간이에요.',
      data: { type: NOTIF_TYPE.DELAYED as string },
    }),
    scheduleAt(delayLock, {
      title: '오늘의 걱정 타임이 지나갔어요',
      body: '내일 또 만나요.',
      data: { type: NOTIF_TYPE.DELAY_LOCK as string },
    }),
  ]);

  return { delayedNotifId: delayedId, delayLockNotifId: delayLockId };
}

// ─── 타이머 종료 알림 ─────────────────────────────────────

export async function scheduleTimerEnd(
  startedAt: Date,
  focusMinutes: number
): Promise<string | null> {
  const endAt = new Date(startedAt.getTime() + focusMinutes * 60 * 1000);
  return scheduleAt(endAt, {
    title: '걱정 타임이 끝났어요 🌸',
    body: '수고하셨어요. 오늘도 용감하게 걱정을 마주하셨네요.',
    data: { type: NOTIF_TYPE.TIMER_END as string },
  });
}

// ─── 알림 취소 ────────────────────────────────────────────

export async function cancelNotifications(ids: (string | null | undefined)[]): Promise<void> {
  const valid = ids.filter(Boolean) as string[];
  await Promise.all(valid.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
}

export async function cancelCycleNotifications(ids: {
  primaryNotifId?: string | null;
  secondaryNotifId?: string | null;
  lockNotifId?: string | null;
  timerEndNotifId?: string | null;
}): Promise<void> {
  await cancelNotifications(Object.values(ids));
}

// ─── 앱 진입 시 재예약 보정 ───────────────────────────────

/**
 * Doze 모드 등으로 예약이 사라진 경우 복구
 * 현재 예약 목록을 확인하고 없으면 재예약
 */
export async function reconcileNotifications(worryTime: WorryTime): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const hasPrimary = scheduled.some(
    (n) => (n.content.data as any)?.type === NOTIF_TYPE.PRIMARY
  );
  if (!hasPrimary) {
    console.log('[scheduler] 1차 알림이 없어 재예약합니다');
    await scheduleCycle(worryTime);
  }
}

// ─── 내부 헬퍼 ────────────────────────────────────────────

async function scheduleAt(
  date: Date,
  content: { title: string; body: string; data: Record<string, unknown> }
): Promise<string | null> {
  // 이미 지난 시각이면 예약하지 않음
  if (date <= new Date()) {
    console.warn('[scheduler] 이미 지난 시각, 예약 건너뜀:', date.toISOString());
    return null;
  }

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: content.title,
        body: content.body,
        data: content.data,
        sound: true,
        // Android: HIGH importance 채널 사용 → Doze 모드 우회
        // iOS는 channelId를 무시함
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        // Android: 명시적으로 채널 지정
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
    });
    console.log(`[scheduler] 예약 완료: ${content.title} @ ${date.toLocaleString()} (id: ${id})`);
    return id;
  } catch (e) {
    console.error('[scheduler] 예약 실패:', e);
    return null;
  }
}

// ─── 디버그용 ─────────────────────────────────────────────

export async function getAllScheduled(): Promise<Notifications.NotificationRequest[]> {
  return Notifications.getAllScheduledNotificationsAsync();
}

export async function cancelAllScheduled(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
