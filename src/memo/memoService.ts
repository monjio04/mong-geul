/**
 * 메모 서비스
 *
 * storage.ts의 메모 함수들을 래핑하고 비즈니스 규칙을 추가:
 * - 메모 작성 가능 시간 검증 (걱정 타임 시작 전까지만)
 * - 빈 메모 검증
 * - 사이클 시작/종료에 따른 자동 리셋은 timerService.completeTimer / lockCycle에서 호출
 *
 * 메모 라이프사이클:
 *   직전 걱정 타임 종료 → [작성 가능] → 다음 걱정 타임 1차 알림 → [잠금/표시] → 종료 → 리셋
 */

import {
  getCycleMemos as storageGetCycleMemos,
  addMemo as storageAddMemo,
  resetMemos as storageResetMemos,
  getUserProfile,
  getTimerState,
} from '../storage/storage';
import type { MemoEntry } from '../storage/types';
import { resolveState } from '../timer/stateMachine';

// ─── 메모 작성 가능 여부 ──────────────────────────────────

export type MemoWriteBlockReason =
  | 'in_worry_time'   // 걱정 타임 진행 중 (메모 잠금)
  | 'no_profile';     // 온보딩 미완료

export interface MemoWriteAvailability {
  canWrite: boolean;
  reason?: MemoWriteBlockReason;
}

/**
 * 지금 메모를 작성할 수 있는 상태인지 확인
 * - 걱정 타임 활성/진행 중일 때는 잠금
 * - 그 외 시간(idle/locked/completed/delayed)에는 작성 가능
 */
export async function canWriteMemo(now: Date = new Date()): Promise<MemoWriteAvailability> {
  const profile = await getUserProfile();
  if (!profile) return { canWrite: false, reason: 'no_profile' };

  const timerState = await getTimerState();
  const state = resolveState(timerState, now, profile.worryTime);

  // 걱정 타임 진행 중(active, inProgress, advanced)이면 메모 잠금
  if (state === 'active' || state === 'inProgress' || state === 'advanced') {
    return { canWrite: false, reason: 'in_worry_time' };
  }

  return { canWrite: true };
}

// ─── 메모 추가 ────────────────────────────────────────────

export type AddMemoError =
  | { type: 'empty' }
  | { type: 'locked'; reason: MemoWriteBlockReason };

export interface AddMemoResult {
  ok: boolean;
  error?: AddMemoError;
}

/**
 * 새 메모 추가
 * - 빈 메모 거부
 * - 걱정 타임 진행 중에는 거부
 * - 성공 시 사이클 메모 배열 끝에 push
 */
export async function addMemo(text: string, now: Date = new Date()): Promise<AddMemoResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, error: { type: 'empty' } };
  }

  const availability = await canWriteMemo(now);
  if (!availability.canWrite) {
    return {
      ok: false,
      error: { type: 'locked', reason: availability.reason ?? 'in_worry_time' },
    };
  }

  await storageAddMemo(trimmed);
  return { ok: true };
}

// ─── 메모 조회 ────────────────────────────────────────────

/**
 * 현재 사이클의 모든 메모 (시간순)
 * - 걱정 타임 화면에서 슬라이드로 표시
 */
export async function getCycleMemos(): Promise<MemoEntry[]> {
  return storageGetCycleMemos();
}

/**
 * 현재 사이클에 메모가 있는지 (UI hint 용)
 */
export async function hasCycleMemos(): Promise<boolean> {
  const memos = await storageGetCycleMemos();
  return memos.length > 0;
}

// ─── 메모 리셋 ────────────────────────────────────────────

/**
 * 사이클 메모 전체 삭제
 * timerService.completeTimer / lockCycle 내부에서 호출됨
 */
export async function resetMemos(): Promise<void> {
  await storageResetMemos();
}
