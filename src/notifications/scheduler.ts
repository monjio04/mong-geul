/**
 * 알림 스케줄링 모듈
 *
 * 알림 구조 (1사이클):
 *   [A] 1차 알림 — 설정 시각 (단순 알림, 탭 → 홈)
 *   [B] 2차 알림 — 1차 + 30분 (액션 버튼 2개: 걱정타임 미루기 / 지금 작성하기)
 *
 * 미루기 추가 알림:
 *   [C] 재알림 — 사용자 지정 시각 (단순 알림, 탭 → 홈)
 *
 * 제거된 알림:
 *   - LOCK (사이클 종료 알림) — 사용자 결정으로 제거
 *   - DELAY_LOCK (미루기 잠금) — 제거
 *   - TIMER_END (타이머 종료 알림) — 제거
 *
 * 호환성: TimerState 의 lockNotifId / timerEndNotifId 필드는 유지하되 항상 null.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  getNextPrimaryAlarm,
  getSecondaryAlarmTime,
  type WorryTime,
} from '../timer/worryTimeWindow';
import { getUserProfile } from '../storage/storage';

// ─── Android 알림 채널 ─────────────────────────────────────
// HIGH importance → Doze 모드에서도 정시 발화 시도

const CHANNEL_ID = 'worry-time-alarm';

export async function setupAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: '걱정 타임 알림',
    description: '걱정 타임 시작/유예 알림',
    importance: Notifications.AndroidImportance.HIGH,
    // 알림음 끄고 진동만 사용 (사용자 요청)
    enableVibrate: true,
    vibrationPattern: [0, 250, 250, 250],
    sound: null,
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
      // 알림음 비활성 — 진동만 (Android channel.enableVibrate + iOS device silent mode)
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// ─── 알림 카테고리 (액션 버튼) ──────────────────────────────
// 2차 알림에 부착하는 액션 버튼 2개:
//  - DELAY: "걱정타임 미루기" → App.tsx 핸들러가 홈 + DelayConfirmSheet 모달
//  - START_NOW: "지금 작성하기" → App.tsx 핸들러가 홈 (active 상태)

export const NOTIF_CATEGORY = {
  WORRY_PROMPT: 'WORRY_PROMPT',
} as const;

export const NOTIF_ACTION = {
  DELAY: 'DELAY',
  START_NOW: 'START_NOW',
} as const;

async function registerNotificationCategories(): Promise<void> {
  await Notifications.setNotificationCategoryAsync(NOTIF_CATEGORY.WORRY_PROMPT, [
    {
      identifier: NOTIF_ACTION.DELAY,
      buttonTitle: '걱정타임 미루기',
      options: { opensAppToForeground: true },
    },
    {
      identifier: NOTIF_ACTION.START_NOW,
      buttonTitle: '지금 작성하기',
      options: { opensAppToForeground: true },
    },
  ]);
}

/**
 * 앱 시작 시 한 번 호출 — 핸들러 + 채널 + 카테고리 셋업
 */
export async function initNotifications(): Promise<void> {
  initNotificationHandler();
  await setupAndroidChannel();
  await registerNotificationCategories();
}

// ─── 알림 식별자 (data 필드로 구분) ────────────────────────

export const NOTIF_TYPE = {
  PRIMARY: 'worry_primary',
  SECONDARY: 'worry_secondary',
  DELAYED: 'worry_delayed',
} as const;

// ─── 1사이클 예약 ─────────────────────────────────────────

// 호환성: lockNotifId 필드는 유지 (항상 null)
export interface ScheduledIds {
  primaryNotifId: string | null;
  secondaryNotifId: string | null;
  lockNotifId: string | null;
}

/**
 * 걱정 타임 1사이클 알림 2개 예약 (1차 + 2차)
 * 사용자 nickname 은 storage.getUserProfile() 에서 조회.
 *
 * @param worryTime 알림을 발화할 시각(시/분)
 * @param fromTime 알림 계산 기준 시점 (기본=now).
 *                 completeTimer/lockCycle 호출 시 getNextCycleStart(now) 를 넘겨야
 *                 "오늘 worryTime 이 미래여도 다음 cycle 로" 스케줄됨.
 */
export async function scheduleCycle(
  worryTime: WorryTime,
  fromTime?: Date,
): Promise<ScheduledIds> {
  const baseTime = fromTime ?? new Date();
  const primaryAlarm = getNextPrimaryAlarm(baseTime, worryTime);
  const secondaryAlarm = getSecondaryAlarmTime(primaryAlarm);

  const profile = await getUserProfile();
  const nickname = profile?.nickname ?? '회원';

  const [primaryId, secondaryId] = await Promise.all([
    scheduleAt(primaryAlarm, {
      title: `${nickname}님, 오늘의 걱정을 꺼내볼 시간이에요`,
      body: '잠시 정리하고, 다시 일상으로 돌아가요.',
      data: { type: NOTIF_TYPE.PRIMARY as string },
    }),
    scheduleAt(secondaryAlarm, {
      title: `${nickname}님, 아직 걱정타임을 시작하지 않았어요`,
      body: '지금 작성하거나, 편한 시간으로 다시 설정할 수 있어요.',
      data: { type: NOTIF_TYPE.SECONDARY as string },
      categoryIdentifier: NOTIF_CATEGORY.WORRY_PROMPT,
    }),
  ]);

  return {
    primaryNotifId: primaryId,
    secondaryNotifId: secondaryId,
    lockNotifId: null, // 호환성 필드, 더 이상 사용 X
  };
}

// ─── 미루기 알림 ─────────────────────────────────────────

// 호환성: delayLockNotifId 필드 유지 (항상 null)
export interface DelayScheduledIds {
  delayedNotifId: string | null;
  delayLockNotifId: string | null;
}

export async function scheduleDelayed(delayedUntil: Date): Promise<DelayScheduledIds> {
  const profile = await getUserProfile();
  const nickname = profile?.nickname ?? '회원';

  const delayedId = await scheduleAt(delayedUntil, {
    title: `${nickname}님, 미뤄둔 걱정타임이에요`,
    body: '지금 걱정을 꺼내볼 시간이에요.',
    data: { type: NOTIF_TYPE.DELAYED as string },
  });

  return {
    delayedNotifId: delayedId,
    delayLockNotifId: null, // 호환성 필드, 더 이상 사용 X
  };
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

interface ScheduleContent {
  title: string;
  body: string;
  data: Record<string, unknown>;
  categoryIdentifier?: string;
}

async function scheduleAt(date: Date, content: ScheduleContent): Promise<string | null> {
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
        // 알림음 OFF — 진동만 (Android: channel 의 enableVibrate 사용 / iOS: 사일런트 모드 시 진동)
        sound: false,
        ...(content.categoryIdentifier ? { categoryIdentifier: content.categoryIdentifier } : {}),
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
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
