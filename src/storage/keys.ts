// AsyncStorage 키 상수
export const STORAGE_KEYS = {
  SCHEMA_VERSION: 'schemaVersion',
  USER_PROFILE: 'user:profile',
  TIMER_STATE: 'timer:state',
  MEMO_CURRENT: 'memo:current',
  PROGRESS_COUNT: 'progress:completedCount',
  COPYWRITE_SEEN_IDS: 'copywrite:seenIds',
  WORRY_COMPLETE_COUNT: 'worry:completeCount',
  FLOWER_CYCLE_USED: 'flower:cycle:used',  // 이번 7개 사이클에서 사용한 type 배열
} as const;

// 날짜 기반 키 생성 (1차 알림 날짜 기준)
export const recordKey = (date: string) => `record:${date}`; // 'YYYY-MM-DD'

export const SCHEMA_VERSION = 1;
