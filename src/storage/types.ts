// ─── 사용자 프로필 ──────────────────────────────────────
export type BgmType = 'classic' | 'whitenoise' | 'none';

export interface UserProfile {
  nickname: string;       // 공백 포함 최대 12자
  worryTime: {            // 걱정 타임 설정 시각
    hour: number;         // 0~23
    minute: number;       // 0 or 30 등
  };
  focusMinutes: number;   // 15 | 20 | 25 | 30
  bgm: BgmType;           // BGM 타입 (오디오 ON일 때 어떤 소리)
  notificationsEnabled: boolean;  // 알림 토글
  audioEnabled: boolean;          // BGM 재생 토글
}

// ─── 하루 기록 ─────────────────────────────────────────
export type RecordStatus = 'flower' | 'sprout' | 'empty';

export type FlowerType = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** 풀밭 안 꽃 위치 — 0~1 비율 (반응형, 화면 크기와 무관) */
export interface FlowerPosition {
  x: number; // 0~1 (좌→우)
  y: number; // 0~1 (위→아래)
}

export interface DayRecord {
  status: RecordStatus;
  completedAt: string | null;   // ISO timestamp
  isDelayed: boolean;           // 미루기 후 완료
  isAdvanced: boolean;          // 앞당기기 후 완료
  flowerType?: FlowerType;      // status='flower' 일 때 — 7종 중 1개
  position?: FlowerPosition;    // flower/sprout 시 Home 언덕 안 좌표
}

// ─── 메모 ──────────────────────────────────────────────
export interface MemoEntry {
  text: string;
  createdAt: string;  // ISO timestamp
}

// ─── 타이머 상태 ────────────────────────────────────────
export type WorkerState =
  | 'idle'         // 걱정 타임 아님, 잠금 없음
  | 'active'       // 걱정 타임 시간 — 아직 시작 안 함
  | 'inProgress'   // 타이머 진행 중
  | 'delayed'      // 미루기 대기 중
  | 'advanced'     // 앞당기기 진행 중 (걱정 타임 전 자발적 작성)
  | 'locked'       // 오늘 사이클 잠금 (완료 or 미완료)
  | 'completed';   // 오늘 사이클 정상 완료

export interface TimerState {
  isLocked: boolean;
  lockedAt: string | null;          // 잠금 시각 (ISO)
  alarmDate: string | null;         // 1차 알림 날짜 'YYYY-MM-DD'
  isDelayed: boolean;               // 미루기 선택 여부
  isAdvanced: boolean;              // 앞당기기 선택 여부
  delayedUntil: string | null;      // 미루기 재알림 시각 (ISO)
  startedAt: string | null;         // 타이머 시작 시각 (ISO)

  // 알림 ID 추적 (취소용)
  primaryNotifId: string | null;
  secondaryNotifId: string | null;
  lockNotifId: string | null;
  timerEndNotifId: string | null;
}

// ─── 진행도 ─────────────────────────────────────────────
export interface AppProgress {
  completedCount: number;   // 0~7, 7 도달 시 일주일 돌아보기 트리거 후 리셋
}
