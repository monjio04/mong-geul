// AsyncStorage 키 상수
export const STORAGE_KEYS = {
  SCHEMA_VERSION: 'schemaVersion',
  USER_PROFILE: 'user:profile',
  TIMER_STATE: 'timer:state',
  MEMO_CURRENT: 'memo:current',
  PROGRESS_COUNT: 'progress:completedCount',
  COPYWRITE_SEEN_IDS: 'copywrite:seenIds',
  WORRY_COMPLETE_COUNT: 'worry:completeCount',
} as const;

// 날짜 기반 키 생성 (1차 알림 날짜 기준)
export const recordKey = (date: string) => `record:${date}`; // 'YYYY-MM-DD'

export const SCHEMA_VERSION = 1;
