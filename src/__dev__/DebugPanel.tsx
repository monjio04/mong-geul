/**
 * 개발용 디버그 패널
 * __DEV__ 빌드에서만 노출
 * - 기본: 우측 상단에 🛠 작은 토글 버튼만 표시
 * - 탭하면 전체 패널이 펼쳐짐
 * - 시간 강제 변경, AsyncStorage 초기화, 현재 상태 확인
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearAllData, dumpAllData, getTimerState, getUserProfile } from '../storage/storage';
import { STORAGE_KEYS } from '../storage/keys';
import { getAllScheduled, cancelAllScheduled } from '../notifications/scheduler';
import { resolveState } from '../timer/stateMachine';
import { applyDelay } from '../timer/timerService';

export default function DebugPanel() {
  const [expanded, setExpanded] = useState(false);
  const [log, setLog] = useState<string>('탭하면 정보를 확인할 수 있어요');

  const appendLog = (msg: string) => {
    setLog((prev) => `${new Date().toLocaleTimeString()} ${msg}\n${prev}`);
  };

  const showStorageState = async () => {
    const data = await dumpAllData();
    appendLog('Storage:\n' + JSON.stringify(data, null, 2));
  };

  const showTimerState = async () => {
    const profile = await getUserProfile();
    const state = await getTimerState();
    if (!profile) {
      appendLog('프로필 없음 (온보딩 미완료)');
      return;
    }
    const resolved = resolveState(state, new Date(), profile.worryTime);
    appendLog(`상태 머신: ${resolved}\n타이머: ${JSON.stringify(state, null, 2)}`);
  };

  const showScheduled = async () => {
    const scheduled = await getAllScheduled();
    if (scheduled.length === 0) {
      appendLog('예약된 알림 없음');
      return;
    }
    const info = scheduled.map((n) => {
      const trigger = n.trigger as any;
      const dateStr = trigger?.value
        ? new Date(trigger.value).toLocaleString()
        : '?';
      return `• ${n.content.title} @ ${dateStr}`;
    }).join('\n');
    appendLog(`예약된 알림 (${scheduled.length}개):\n${info}`);
  };

  // 메모 100개 시드 (warning 토스트 테스트용)
  //   - 사이클 메모 배열에 100개 push → 다음 addMemo 시도 시 MAX_MEMOS_PER_CYCLE 초과 throw
  //   - MemoScreen catch 가 emitGlobalToast(..., 'warning') 호출
  const seedMemos100 = async () => {
    const now = Date.now();
    const memos = Array.from({ length: 100 }, (_, i) => ({
      text: `[테스트] 메모 ${i + 1}`,
      // 1분 간격으로 과거→현재 (UI 시간 표시 자연스럽게)
      createdAt: new Date(now - (99 - i) * 60_000).toISOString(),
    }));
    await AsyncStorage.setItem(STORAGE_KEYS.MEMO_CURRENT, JSON.stringify(memos));
    appendLog('메모 100개 시드 완료.\n메모 작성 → "작성 완료" 시도 시 warning 토스트 노출.');
  };

  // 메모 비우기 — 시드 되돌리기용
  const clearMemos = async () => {
    await AsyncStorage.removeItem(STORAGE_KEYS.MEMO_CURRENT);
    appendLog('메모 초기화 완료.');
  };

  // 미루기 1분 — applyDelay(now+1min)
  //   · 사이클 알림(1·2차·잠금) 취소 + 1분 후 재알림 + 31분 후 미루기 잠금 예약
  //   · 호출 직후 state='delayed' → 1분 후 'active' → 31분 후 'locked' (state machine 자동 전이)
  //   · 'active' 외 상태에서도 실행은 됨 (테스트 편의), 단 의미적으로는 active 분기 검증용
  const handleDelay1Min = async () => {
    const profile = await getUserProfile();
    if (!profile) {
      appendLog('프로필 없음 — 온보딩 먼저.');
      return;
    }
    const timerState = await getTimerState();
    const state = resolveState(timerState, new Date(), profile.worryTime);
    const delayedUntil = new Date(Date.now() + 60 * 1000);
    try {
      await applyDelay(delayedUntil);
      appendLog(
        `미루기 1분 실행 (직전 state=${state}) → ${delayedUntil.toLocaleTimeString()} 재알림 예약\n잠금 시각: ${new Date(delayedUntil.getTime() + 30 * 60 * 1000).toLocaleTimeString()}`,
      );
    } catch (e) {
      appendLog(`미루기 실패: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      '초기화',
      '모든 데이터를 삭제할까요?\n(온보딩부터 다시 시작됨)',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            await cancelAllScheduled();
            appendLog('전체 초기화 완료.\n폰을 흔들거나 Reload를 눌러 앱을 재시작하세요.');
            Alert.alert(
              '초기화 완료',
              '앱을 다시 시작해야 온보딩이 나타나요.\n폰을 흔들어서 메뉴 → Reload를 누르거나, 앱을 완전히 종료 후 다시 열어주세요.',
            );
          },
        },
      ],
    );
  };

  if (!__DEV__) return null;

  // 접힌 상태: 작은 토글 버튼만 표시
  if (!expanded) {
    return (
      <TouchableOpacity
        style={styles.toggleClosed}
        onPress={() => setExpanded(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.toggleClosedText}>🛠</Text>
      </TouchableOpacity>
    );
  }

  // 펼쳐진 상태: 전체 패널
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>🛠 Debug Panel</Text>
        <TouchableOpacity onPress={() => setExpanded(false)}>
          <Text style={styles.closeBtn}>접기 ▼</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.buttons}>
        <DebugButton label="Storage" onPress={showStorageState} />
        <DebugButton label="상태" onPress={showTimerState} />
        <DebugButton label="알림 목록" onPress={showScheduled} />
        <DebugButton label="메모 100개" onPress={seedMemos100} color="#16AF5D" />
        <DebugButton label="메모 비우기" onPress={clearMemos} color="#7B8794" />
        <DebugButton label="미루기 1분" onPress={handleDelay1Min} color="#F5A623" />
        <DebugButton label="전체 초기화" onPress={handleClearAll} color="#E53935" />
      </View>
      <ScrollView style={styles.log}>
        <Text style={styles.logText}>{log}</Text>
      </ScrollView>
    </View>
  );
}

function DebugButton({
  label, onPress, color = '#4A90E2',
}: {
  label: string; onPress: () => void; color?: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: color }]}
      onPress={onPress}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // 접힌 상태 (작은 버튼) — 좌측 하단 (설정 아이콘과 안 겹치게)
  toggleClosed: {
    position: 'absolute',
    bottom: 120,
    left: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    opacity: 0.7,
  },
  toggleClosedText: { fontSize: 18 },

  // 펼친 상태 (전체 패널)
  container: {
    position: 'absolute',
    top: 50,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.92)',
    padding: 10,
    maxHeight: 320,
    borderRadius: 12,
    zIndex: 9999,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  header: { color: '#fff', fontWeight: 'bold' },
  closeBtn: { color: '#aaa', fontSize: 12 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  button: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  buttonText: { color: '#fff', fontSize: 12 },
  log: { maxHeight: 220 },
  logText: { color: '#0f0', fontSize: 10, fontFamily: 'monospace' },
});
