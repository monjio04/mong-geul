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
  getAlarmDateString,
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
      // 앱이 켜져 있을 때 도착한 알림도 iOS 는 기본음(무음 모드면 진동) 재생
      shouldPlaySound: Platform.OS === 'ios',
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// ─── 알림 카테고리 (액션 버튼) ──────────────────────────────
// 2차 알림에만 부착하는 액션 버튼 2개:
//  - DELAY: "걱정타임 미루기" → App.tsx 핸들러가 홈 + DelayConfirmSheet 모달
//  - START_NOW: "지금 작성하기" → App.tsx 핸들러가 홈 (active 상태)
// (미루기 재알림에는 부착 X — 사이클당 미루기 1회 제한이라 또 미루기 옵션이 부적절)

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

// ─── 사이클 예약 ──────────────────────────────────────────
//
// 앱을 열지 않아도 알림이 이어지도록 앞으로 UPCOMING_CYCLE_DAYS 일치를 미리 예약.
// (하루 2개 × 14일 = 28개 — iOS 예약 알림 한도 64개 이내)
// 각 알림은 data.cycleDate('YYYY-MM-DD', 1차 알림 날짜) 로 어느 사이클 것인지 구분하고,
// 같은 사이클·같은 종류가 이미 예약돼 있으면 다시 예약하지 않음 (중복 방지).

export const UPCOMING_CYCLE_DAYS = 14;

// 호환성: lockNotifId 필드는 유지 (항상 null)
export interface ScheduledIds {
  primaryNotifId: string | null;
  secondaryNotifId: string | null;
  lockNotifId: string | null;
}

interface CycleNotifIndex {
  /** `${type}:${cycleDate}` → notification id */
  byKey: Map<string, string>;
  /** cycleDate 태그가 없는 이전 버전의 1차/2차 알림 */
  legacyIds: string[];
}

const cycleKey = (type: string, cycleDate: string) => `${type}:${cycleDate}`;

async function getCycleNotifIndex(): Promise<CycleNotifIndex> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const byKey = new Map<string, string>();
  const legacyIds: string[] = [];
  for (const n of all) {
    const data = n.content.data as { type?: string; cycleDate?: string } | undefined;
    if (data?.type !== NOTIF_TYPE.PRIMARY && data?.type !== NOTIF_TYPE.SECONDARY) continue;
    if (data.cycleDate) byKey.set(cycleKey(data.type, data.cycleDate), n.identifier);
    else legacyIds.push(n.identifier);
  }
  return { byKey, legacyIds };
}

async function getNickname(): Promise<string> {
  const profile = await getUserProfile();
  return profile?.nickname ?? '회원';
}

async function scheduleCycleAt(
  primaryAlarm: Date,
  nickname: string,
  index: CycleNotifIndex,
): Promise<ScheduledIds> {
  const cycleDate = getAlarmDateString(primaryAlarm);
  const primaryKey = cycleKey(NOTIF_TYPE.PRIMARY, cycleDate);
  const secondaryKey = cycleKey(NOTIF_TYPE.SECONDARY, cycleDate);

  const [primaryId, secondaryId] = await Promise.all([
    index.byKey.get(primaryKey) ??
      scheduleAt(primaryAlarm, {
        title: `${nickname}님, 오늘의 걱정을 꺼내볼 시간이에요`,
        body: '잠시 정리하고, 다시 일상으로 돌아가요.',
        data: { type: NOTIF_TYPE.PRIMARY, cycleDate },
      }),
    index.byKey.get(secondaryKey) ??
      scheduleAt(getSecondaryAlarmTime(primaryAlarm), {
        title: `${nickname}님, 아직 걱정타임을 시작하지 않았어요`,
        body: '지금 작성하거나, 편한 시간으로 다시 설정할 수 있어요.',
        data: { type: NOTIF_TYPE.SECONDARY, cycleDate },
        categoryIdentifier: NOTIF_CATEGORY.WORRY_PROMPT,
      }),
  ]);
  if (primaryId) index.byKey.set(primaryKey, primaryId);
  if (secondaryId) index.byKey.set(secondaryKey, secondaryId);

  return {
    primaryNotifId: primaryId,
    secondaryNotifId: secondaryId,
    lockNotifId: null, // 호환성 필드, 더 이상 사용 X
  };
}

/**
 * 걱정 타임 1사이클 알림 2개 (1차 + 2차) 예약. 이미 예약돼 있으면 기존 id 반환.
 *
 * @param worryTime 알림을 발화할 시각(시/분)
 * @param fromTime 알림 계산 기준 시점 (기본=now).
 *                 completeTimer/lockCycle 호출 시 다음 cycle 시작점을 넘겨야
 *                 "오늘 worryTime 이 미래여도 다음 cycle 로" 스케줄됨.
 */
export async function scheduleCycle(
  worryTime: WorryTime,
  fromTime?: Date,
): Promise<ScheduledIds> {
  const primaryAlarm = getNextPrimaryAlarm(fromTime ?? new Date(), worryTime);
  const [index, nickname] = await Promise.all([getCycleNotifIndex(), getNickname()]);
  return scheduleCycleAt(primaryAlarm, nickname, index);
}

/**
 * firstPrimary 사이클부터 days 일치 1차/2차 알림을 채움 (빠진 것만 예약, 지난 시각은 건너뜀).
 */
export async function ensureUpcomingCycles(
  firstPrimary: Date,
  days: number = UPCOMING_CYCLE_DAYS,
): Promise<void> {
  const [index, nickname] = await Promise.all([getCycleNotifIndex(), getNickname()]);
  const now = new Date();
  const primary = new Date(firstPrimary);
  for (let i = 0; i < days; i++) {
    // 1차·2차 모두 지난 사이클은 건너뜀
    if (getSecondaryAlarmTime(primary) > now) {
      await scheduleCycleAt(new Date(primary), nickname, index);
    }
    primary.setDate(primary.getDate() + 1);
  }
}

/** 미리 예약된 1차/2차 알림 전부 취소 (걱정타임 시각 변경, 알림 끄기 시) */
export async function cancelUpcomingCycles(): Promise<void> {
  const { byKey, legacyIds } = await getCycleNotifIndex();
  await cancelNotifications([...byKey.values(), ...legacyIds]);
}

/** cycleDate 가 afterDate 보다 뒤인 사이클의 1차/2차 알림만 취소 (오늘 사이클은 유지) */
export async function cancelCyclesAfter(afterDate: string): Promise<void> {
  const { byKey } = await getCycleNotifIndex();
  const ids = [...byKey.entries()]
    .filter(([key]) => key.slice(key.indexOf(':') + 1) > afterDate)
    .map(([, id]) => id);
  await cancelNotifications(ids);
}

/**
 * 이전 버전이 예약한 cycleDate 없는 1차/2차 알림 정리.
 * 새 방식 알림과 같은 날 중복으로 울리지 않도록, 있으면 취소하고 true 반환.
 */
export async function cancelLegacyCycleNotifications(): Promise<boolean> {
  const { legacyIds } = await getCycleNotifIndex();
  if (legacyIds.length === 0) return false;
  await cancelNotifications(legacyIds);
  return true;
}

/** 해당 사이클에 예약돼 있는 1차/2차 알림 id (없으면 null) */
export async function getCycleNotifIds(cycleDate: string): Promise<ScheduledIds> {
  const { byKey } = await getCycleNotifIndex();
  return {
    primaryNotifId: byKey.get(cycleKey(NOTIF_TYPE.PRIMARY, cycleDate)) ?? null,
    secondaryNotifId: byKey.get(cycleKey(NOTIF_TYPE.SECONDARY, cycleDate)) ?? null,
    lockNotifId: null,
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
    // 액션 버튼 없음 — 미루기는 사이클당 1회만이라 "걱정타임 미루기" 다시 노출하면 혼란
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
        // Android: 소리 없이 channel 진동만. iOS 는 진동만 지정할 수 없어 기본음 사용
        // (무음 스위치 ON → 진동만, OFF → 소리+진동)
        sound: Platform.OS === 'ios' ? 'default' : false,
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
