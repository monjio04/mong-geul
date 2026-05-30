import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, SCHEMA_VERSION, recordKey } from './keys';
import type {
  UserProfile,
  DayRecord,
  TimerState,
  MemoEntry,
  AppProgress,
} from './types';

// ─── 제네릭 헬퍼 ────────────────────────────────────────

async function getItem<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function setItem<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

async function removeItem(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

// ─── 스키마 초기화 ────────────────────────────────────────

export async function initSchema(): Promise<void> {
  const version = await getItem<number>(STORAGE_KEYS.SCHEMA_VERSION);
  if (version === null) {
    // 최초 설치
    await setItem(STORAGE_KEYS.SCHEMA_VERSION, SCHEMA_VERSION);
  } else if (version < SCHEMA_VERSION) {
    // 마이그레이션 필요 시 여기에 추가
    await setItem(STORAGE_KEYS.SCHEMA_VERSION, SCHEMA_VERSION);
  }
}

export async function isOnboardingDone(): Promise<boolean> {
  const profile = await getItem<UserProfile>(STORAGE_KEYS.USER_PROFILE);
  return profile !== null;
}

// ─── 사용자 프로필 ────────────────────────────────────────

export async function getUserProfile(): Promise<UserProfile | null> {
  const profile = await getItem<UserProfile>(STORAGE_KEYS.USER_PROFILE);
  if (!profile) return null;
  // 신규 필드 기본값 채우기 (마이그레이션)
  return {
    ...profile,
    bgm: profile.bgm ?? 'classic',
    notificationsEnabled: profile.notificationsEnabled ?? true,
    audioEnabled: profile.audioEnabled ?? true,
  };
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await setItem(STORAGE_KEYS.USER_PROFILE, profile);
}

/**
 * pending(다음 사이클부터 적용) 필드를 active로 promote.
 * 호출 시점:
 *  - timerService.completeTimer / lockCycle 안에서 scheduleCycle 직전
 *    → 다음 cycle 알람이 새 값으로 예약됨
 *  - SettingsScreen 에서 locked/completed 상태일 때 즉시 호출
 *    → 다음 cycle 알람이 OLD 값으로 이미 예약된 상태라면 caller가 cancel/reschedule
 *
 * pending 필드가 비어 있으면 no-op.
 * 반환값: 적용 후 (또는 변경 없으면 원본) profile.
 */
export async function applyPendingProfile(): Promise<UserProfile | null> {
  const profile = await getUserProfile();
  if (!profile) return null;

  let changed = false;
  const updated: UserProfile = { ...profile };

  if (profile.pendingWorryTime) {
    updated.worryTime = profile.pendingWorryTime;
    updated.pendingWorryTime = undefined;
    changed = true;
  }
  if (profile.pendingFocusMinutes !== undefined) {
    updated.focusMinutes = profile.pendingFocusMinutes;
    updated.pendingFocusMinutes = undefined;
    changed = true;
  }

  if (changed) await saveUserProfile(updated);
  return updated;
}

// ─── 타이머 상태 ─────────────────────────────────────────

const DEFAULT_TIMER_STATE: TimerState = {
  isLocked: false,
  lockedAt: null,
  alarmDate: null,
  isDelayed: false,
  isAdvanced: false,
  delayedUntil: null,
  startedAt: null,
  primaryNotifId: null,
  secondaryNotifId: null,
  lockNotifId: null,
  timerEndNotifId: null,
};

export async function getTimerState(): Promise<TimerState> {
  const state = await getItem<TimerState>(STORAGE_KEYS.TIMER_STATE);
  return state ?? { ...DEFAULT_TIMER_STATE };
}

export async function saveTimerState(state: TimerState): Promise<void> {
  await setItem(STORAGE_KEYS.TIMER_STATE, state);
}

export async function resetTimerState(): Promise<void> {
  await setItem(STORAGE_KEYS.TIMER_STATE, { ...DEFAULT_TIMER_STATE });
}

// ─── 하루 기록 ───────────────────────────────────────────

export async function getDayRecord(date: string): Promise<DayRecord | null> {
  return getItem<DayRecord>(recordKey(date));
}

export async function saveDayRecord(date: string, record: DayRecord): Promise<void> {
  await setItem(recordKey(date), record);
}

// 월별 기록 조회 (꽃밭 표시용)
export async function getMonthRecords(
  year: number,
  month: number
): Promise<Record<string, DayRecord>> {
  const result: Record<string, DayRecord> = {};
  const daysInMonth = new Date(year, month, 0).getDate();

  const keys: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(month).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    keys.push(recordKey(`${year}-${mm}-${dd}`));
  }

  const pairs = await AsyncStorage.multiGet(keys);
  for (const [key, value] of pairs) {
    if (value) {
      // key 형태: 'record:YYYY-MM-DD' → 'YYYY-MM-DD' 추출
      const dateStr = key.replace('record:', '');
      result[dateStr] = JSON.parse(value) as DayRecord;
    }
  }
  return result;
}

// ─── 메모 ────────────────────────────────────────────────

export async function getCycleMemos(): Promise<MemoEntry[]> {
  return (await getItem<MemoEntry[]>(STORAGE_KEYS.MEMO_CURRENT)) ?? [];
}

// 한 사이클(걱정타임)에 쌓을 수 있는 메모 최대 개수 — 무한 누적 방지.
export const MAX_MEMOS_PER_CYCLE = 100;

export async function addMemo(text: string): Promise<void> {
  if (!text.trim()) throw new Error('빈 메모는 저장할 수 없습니다');
  const memos = await getCycleMemos();
  if (memos.length >= MAX_MEMOS_PER_CYCLE) {
    throw new Error(`메모는 최대 ${MAX_MEMOS_PER_CYCLE}개까지 저장할 수 있어요`);
  }
  const newEntry: MemoEntry = {
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };
  await setItem(STORAGE_KEYS.MEMO_CURRENT, [...memos, newEntry]);
}

export async function resetMemos(): Promise<void> {
  await removeItem(STORAGE_KEYS.MEMO_CURRENT);
}

// ─── 진행도 (일주일 돌아보기 카운터) ────────────────────────

export async function getProgress(): Promise<AppProgress> {
  return (await getItem<AppProgress>(STORAGE_KEYS.PROGRESS_COUNT)) ?? { completedCount: 0 };
}

export async function incrementProgress(): Promise<{ triggered: boolean }> {
  const progress = await getProgress();
  const next = progress.completedCount + 1;
  if (next >= 7) {
    await setItem(STORAGE_KEYS.PROGRESS_COUNT, { completedCount: 0 });
    return { triggered: true };
  }
  await setItem(STORAGE_KEYS.PROGRESS_COUNT, { completedCount: next });
  return { triggered: false };
}

// ─── 필사 콘텐츠 중복 방지 (seen IDs) ─────────────────────

/**
 * 사용자가 본 필사 콘텐츠 ID 목록 조회.
 * CopywriteScreen 진입 시 entries에서 이 목록을 제외한 후 랜덤 선택.
 */
export async function getSeenCopywriteIds(): Promise<string[]> {
  return (await getItem<string[]>(STORAGE_KEYS.COPYWRITE_SEEN_IDS)) ?? [];
}

/**
 * 본 콘텐츠 ID 추가 (중복 없이).
 */
export async function markCopywriteSeen(id: string): Promise<void> {
  const seen = await getSeenCopywriteIds();
  if (seen.includes(id)) return;
  await setItem(STORAGE_KEYS.COPYWRITE_SEEN_IDS, [...seen, id]);
}

/**
 * 본 콘텐츠 목록 리셋 (전부 본 후 한 바퀴 돌렸을 때).
 */
export async function resetCopywriteSeen(): Promise<void> {
  await removeItem(STORAGE_KEYS.COPYWRITE_SEEN_IDS);
}

// ─── 걱정타임 누적 완료 카운트 ─────────────────────────────
// 2번째 완료 시점에 점검 안내 모달(WorryCheckInSheet)을 1회 표시하기 위한 카운터.
// 필사(Copywrite) 완료는 카운트 X — 걱정타임만.

export async function getWorryCompleteCount(): Promise<number> {
  return (await getItem<number>(STORAGE_KEYS.WORRY_COMPLETE_COUNT)) ?? 0;
}

/** 카운트 +1 후 새 값 반환 */
export async function incrementWorryCompleteCount(): Promise<number> {
  const next = (await getWorryCompleteCount()) + 1;
  await setItem(STORAGE_KEYS.WORRY_COMPLETE_COUNT, next);
  return next;
}

// ─── 개발/디버그용 ────────────────────────────────────────

export async function clearAllData(): Promise<void> {
  await AsyncStorage.clear();
}

export async function dumpAllData(): Promise<Record<string, unknown>> {
  const keys = await AsyncStorage.getAllKeys();
  const pairs = await AsyncStorage.multiGet(keys as string[]);
  const result: Record<string, unknown> = {};
  for (const [key, value] of pairs) {
    if (value) result[key] = JSON.parse(value);
  }
  return result;
}
