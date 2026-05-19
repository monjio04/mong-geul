/**
 * 걱정 타임 시간 판단 모듈
 * - 순수 함수로 구성 (테스트 용이)
 * - 모든 Date는 JS Date 객체로 처리
 */

export interface WorryTime {
  hour: number;
  minute: number;
}

// ─── 기본 상수 ────────────────────────────────────────────
// TODO: 테스트 후 30으로 환원
const SECONDARY_ALARM_OFFSET_MIN = 1;    // [임시 테스트] 1차 알림 후 1분 → 2차 알림 (원래: 30)
const LOCK_OFFSET_MIN = 60;              // 2차 알림 후 1시간 → 잠금
const DELAY_LOCK_OFFSET_MIN = 30;        // 미루기 재알림 후 30분 → 잠금
const MAX_DELAY_HOUR = 4;               // 미루기 상한: 익일 04:00
const MIN_DELAY_OFFSET_MIN = 10;         // 미루기 하한: 현재 시각 +10분

/**
 * 특정 날짜 + 시각을 Date 객체로 반환
 */
function setTimeOnDate(base: Date, hour: number, minute: number): Date {
  const d = new Date(base);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/**
 * 오늘 또는 내일의 1차 알림 시각 반환
 * 현재 시각이 이미 지났으면 내일로
 */
export function getNextPrimaryAlarm(now: Date, worryTime: WorryTime): Date {
  const todayAlarm = setTimeOnDate(now, worryTime.hour, worryTime.minute);
  if (todayAlarm > now) return todayAlarm;
  const tomorrowAlarm = new Date(todayAlarm);
  tomorrowAlarm.setDate(tomorrowAlarm.getDate() + 1);
  return tomorrowAlarm;
}

/**
 * 2차 알림 시각 (1차 + 30분)
 */
export function getSecondaryAlarmTime(primaryAlarm: Date): Date {
  return new Date(primaryAlarm.getTime() + SECONDARY_ALARM_OFFSET_MIN * 60 * 1000);
}

/**
 * 잠금 트리거 시각 (2차 알림 + 1시간)
 */
export function getLockTime(primaryAlarm: Date): Date {
  const secondary = getSecondaryAlarmTime(primaryAlarm);
  return new Date(secondary.getTime() + LOCK_OFFSET_MIN * 60 * 1000);
}

/**
 * 미루기 후 잠금 시각 (재알림 + 30분)
 */
export function getDelayLockTime(delayedUntil: Date): Date {
  return new Date(delayedUntil.getTime() + DELAY_LOCK_OFFSET_MIN * 60 * 1000);
}

/**
 * 현재 사이클의 1차 알림 날짜 ('YYYY-MM-DD')
 * 잠금 시각까지가 현재 사이클 — 자정을 넘겨도 1차 알림 날짜 기준
 */
export function getAlarmDateString(primaryAlarm: Date): string {
  const y = primaryAlarm.getFullYear();
  const m = String(primaryAlarm.getMonth() + 1).padStart(2, '0');
  const d = String(primaryAlarm.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 걱정 타임 활성 여부
 * 1차 알림 시각 이후 & 잠금 시각 이전
 */
export function isInWorryWindow(now: Date, primaryAlarm: Date): boolean {
  const lockTime = getLockTime(primaryAlarm);
  return now >= primaryAlarm && now < lockTime;
}

/**
 * 미루기 picker 선택 가능 범위
 * min: now + 10분
 * max: 다음 04:00 (현재가 04:00 이전이면 오늘 04:00, 이후면 익일)
 */
export function getDelayPickerRange(now: Date): { min: Date; max: Date } {
  const min = new Date(now.getTime() + MIN_DELAY_OFFSET_MIN * 60 * 1000);

  // 가장 가까운 04:00 — 현재가 04:00 이전이면 오늘 04:00, 이후면 익일 04:00
  const max = new Date(now);
  if (now.getHours() >= MAX_DELAY_HOUR) {
    max.setDate(max.getDate() + 1);
  }
  max.setHours(MAX_DELAY_HOUR, 0, 0, 0);

  return { min, max };
}

/**
 * 미루기 가능 여부
 * - 04:00 설정 시 미루기 불가
 * - 이미 미루기 사용한 경우 불가 (isDelayed)
 * - 앞당기기 사용한 경우 불가 (isAdvanced)
 * - picker 선택 가능 범위가 없는 경우 불가 (min > max)
 */
export function canDelay(params: {
  worryTime: WorryTime;
  isDelayed: boolean;
  isAdvanced: boolean;
  now: Date;
}): boolean {
  const { worryTime, isDelayed, isAdvanced, now } = params;
  if (isDelayed || isAdvanced) return false;

  // 04:00 설정은 미루기 없이 1시간 유예만
  if (worryTime.hour === 4 && worryTime.minute === 0) return false;

  const { min, max } = getDelayPickerRange(now);
  return min < max;
}

/**
 * 특정 시각이 걱정 타임 설정 시간보다 이전인지
 * (앞당기기 케이스 판단용)
 */
export function isBeforeWorryTime(now: Date, primaryAlarm: Date): boolean {
  return now < primaryAlarm;
}

/**
 * 현재 날짜 'YYYY-MM-DD' 반환
 */
export function getTodayString(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
