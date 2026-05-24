/**
 * 설정 화면 (Figma 103:200, 215:7984, 215:8025 기준)
 *
 * 섹션:
 *  1. 프로필 (닉네임 + 변경 → NicknameChange)
 *  2. 걱정타임 변경 (시작 시간 / 집중 시간 → 바텀시트)
 *  3. 서비스 설정 (알림 / 오디오 토글)
 *
 * 걱정 타임 진행 중 (active/inProgress/advanced/delayed) 에는 시작/집중 시간 변경 불가.
 */

import React, { useEffect, useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, ScrollView,
  Modal, Platform, Pressable, Switch, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import ExitIcon from '../../assets/icons/exit.svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import {
  getUserProfile, saveUserProfile,
  getTimerState, saveTimerState,
  applyPendingProfile,
} from '../storage/storage';
import type { UserProfile, WorkerState } from '../storage/types';
import { scheduleCycle, cancelCycleNotifications } from '../notifications/scheduler';
import { resolveState } from '../timer/stateMachine';
import { getNextCycleStart } from '../timer/worryTimeWindow';
import { Button, Card, Text } from '../components/ui';
import { TimePickerSheet } from '../components/TimePickerSheet';
import { Colors, Radii, Spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const FOCUS_OPTIONS = [15, 20, 25, 30];

// 변경 확인 모달 상태 — 사용자가 picker 에서 "완료" 누른 직후 한 번 더 확인
type PendingChange =
  | { kind: 'worry'; hour: number; minute: number }
  | { kind: 'focus'; minutes: number };

export default function SettingsScreen({ navigation, route }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [appState, setAppState] = useState<WorkerState>('idle');
  const [worryPickerOpen, setWorryPickerOpen] = useState(false);
  // 진입 시 autoOpenFocusPicker route param 받으면 FocusTimeSheet 자동 열림
  // (WorryCheckIn에서 "설정하러 가기" 진입한 경우)
  const [focusPickerOpen, setFocusPickerOpen] = useState(
    route.params?.autoOpenFocusPicker === true,
  );
  // picker → confirm modal 단계용 (figma 615:1325, 615:1714)
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  // 걱정타임 진행 중 변경 시도 시 모달 (figma 399:504)
  const [lockedModalOpen, setLockedModalOpen] = useState(false);

  useEffect(() => {
    const unsub = navigation.addListener('focus', loadProfile);
    loadProfile();
    return unsub;
  }, [navigation]);

  const loadProfile = async () => {
    const p = await getUserProfile();
    setProfile(p);
    if (p) {
      const timerState = await getTimerState();
      setAppState(resolveState(timerState, new Date(), p.worryTime));
    }
  };

  // 변경 차단 상태 — 오늘 cycle 진행/작성 중일 때만 (delayed는 대기 상태라 변경 허용)
  // delayed 에서 변경 → pending 저장 → 내일부터 적용 (미루기 알람과 무관)
  const isWorryTimeLocked =
    appState === 'active' ||
    appState === 'inProgress' ||
    appState === 'advanced';

  const handleLockedAttempt = () => {
    setLockedModalOpen(true);
  };

  if (!profile) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <Header onBack={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  // pending이 있으면 사용자가 마지막으로 정한 값을 우선 표시
  // (active 값은 오늘 cycle 동안만 유효, 사용자가 본 마지막 선택값이 더 의미 있음)
  const displayedWorryTime = profile.pendingWorryTime ?? profile.worryTime;
  const displayedFocusMinutes = profile.pendingFocusMinutes ?? profile.focusMinutes;
  const formattedTime = formatTime12h(displayedWorryTime.hour, displayedWorryTime.minute);

  // ─── 핸들러 ────────────────────────────────────────────

  /**
   * 시작 시간 변경 — 정책: "다음 사이클부터 적용" (worry-time-change-policy.md)
   *
   *  idle (오늘 cycle 알람 예약됨, 아직 안 발화):
   *    → pending에만 저장. 오늘 알람은 그대로 발화.
   *    → completeTimer/lockCycle 에서 applyPendingProfile() 자동 호출 → 내일부터 NEW.
   *
   *  locked/completed (오늘 cycle 끝, 다음 cycle 알람이 OLD 값으로 예약됨):
   *    → 즉시 applyPending + cancel old next-alarm + reschedule with NEW.
   *    → 그래야 내일 알람이 새 값으로 옴.
   *
   *  active/inProgress/delayed/advanced: isWorryTimeLocked = true → 이 핸들러까지 안 옴.
   */
  const handleWorryTimeChange = async (hour: number, minute: number) => {
    // 일단 pending 에 저장 (active 는 안 건드림)
    const withPending: UserProfile = {
      ...profile,
      pendingWorryTime: { hour, minute },
    };
    await saveUserProfile(withPending);
    setProfile(withPending);

    // locked/completed 면 즉시 적용 + 다음 알람 reschedule
    if (appState === 'locked' || appState === 'completed') {
      const applied = await applyPendingProfile();
      if (!applied) return;

      const state = await getTimerState();
      await cancelCycleNotifications({
        primaryNotifId: state.primaryNotifId,
        secondaryNotifId: state.secondaryNotifId,
        lockNotifId: state.lockNotifId,
      });
      if (applied.notificationsEnabled) {
        // locked/completed = 이번 cycle 끝남. 다음 cycle 부터 적용
        const { primaryNotifId, secondaryNotifId, lockNotifId } =
          await scheduleCycle(applied.worryTime, getNextCycleStart(new Date()));
        await saveTimerState({
          ...state,
          primaryNotifId,
          secondaryNotifId,
          lockNotifId,
        });
      } else {
        await saveTimerState({
          ...state,
          primaryNotifId: null,
          secondaryNotifId: null,
          lockNotifId: null,
        });
      }
      setProfile(applied);
    }
    // idle: pending 그대로. 다음 cycle 시작 시 timerService가 applyPending 자동 호출.
  };

  /**
   * 집중 시간 변경 — 정책: "다음 사이클부터 적용" (worryTime과 통일)
   *
   *  idle: pending 저장만. 오늘 timer가 시작되어도 active focusMinutes (OLD) 사용.
   *  locked/completed: 즉시 applyPending. (focusMinutes는 alarm과 무관, reschedule 불필요)
   */
  const handleFocusChange = async (minutes: number) => {
    const withPending: UserProfile = {
      ...profile,
      pendingFocusMinutes: minutes,
    };
    await saveUserProfile(withPending);
    setProfile(withPending);

    if (appState === 'locked' || appState === 'completed') {
      const applied = await applyPendingProfile();
      if (applied) setProfile(applied);
    }
  };

  const handleToggleNotifications = async (value: boolean) => {
    const updated: UserProfile = { ...profile, notificationsEnabled: value };
    await saveUserProfile(updated);
    setProfile(updated);

    const state = await getTimerState();
    if (value) {
      const { primaryNotifId, secondaryNotifId, lockNotifId } = await scheduleCycle(updated.worryTime);
      await saveTimerState({
        ...state,
        primaryNotifId,
        secondaryNotifId,
        lockNotifId,
      });
    } else {
      await cancelCycleNotifications({
        primaryNotifId: state.primaryNotifId,
        secondaryNotifId: state.secondaryNotifId,
        lockNotifId: state.lockNotifId,
        timerEndNotifId: state.timerEndNotifId,
      });
      await saveTimerState({
        ...state,
        primaryNotifId: null,
        secondaryNotifId: null,
        lockNotifId: null,
        timerEndNotifId: null,
      });
    }
  };

  const handleToggleAudio = async (value: boolean) => {
    const updated: UserProfile = { ...profile, audioEnabled: value };
    await saveUserProfile(updated);
    setProfile(updated);
  };

  // ─── 렌더 ──────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Header onBack={() => navigation.goBack()} />

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyInner}>
        {/* ── 프로필 섹션 ─────────────────────────────── */}
        <View style={styles.profileSection}>
          <View style={styles.profileNameRow}>
            <Text variant="heading">{profile.nickname}</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('NicknameChange')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text variant="xs">변경</Text>
            </TouchableOpacity>
          </View>
          <Text variant="tiny" color="darkGray" style={styles.profileHint}>
            데이터를 이 기기에만 안전하게 저장하고 있습니다.
          </Text>
        </View>

        {/* ── 걱정타임 변경 섹션 ──────────────────────── */}
        <View style={styles.worryTimeSection}>
          <Text variant="title" style={styles.sectionTitle}>걱정타임 변경</Text>
          {/* figma 615:1803 — 섹션 hint (10/400/-0.2) */}
          <Text variant="tiny" color="darkGray" style={styles.sectionHint}>
            오늘은 기존 시간으로 진행되고, 변경한 시간은 다음 걱정타임부터 적용돼요.
          </Text>
          <View style={styles.itemList}>
            {/* 시작 시간 */}
            <SettingRow
              label="시작 시간"
              disabled={isWorryTimeLocked}
              onPress={
                isWorryTimeLocked ? handleLockedAttempt : () => setWorryPickerOpen(true)
              }
            >
              <View style={styles.timeRowValue}>
                <View style={styles.timeUnderline}>
                  <Text
                    variant="body"
                    color={isWorryTimeLocked ? 'darkGray' : 'textPrimary'}
                  >
                    {formattedTime.display}
                  </Text>
                </View>
                <Text
                  variant="xs"
                  color={isWorryTimeLocked ? 'darkGray' : 'textPrimary'}
                >
                  {formattedTime.ampm}
                </Text>
              </View>
            </SettingRow>

            {/* 집중 시간 */}
            <SettingRow
              label="집중 시간"
              disabled={isWorryTimeLocked}
              onPress={
                isWorryTimeLocked ? handleLockedAttempt : () => setFocusPickerOpen(true)
              }
            >
              <View style={styles.focusRowValue}>
                <Text
                  variant="body"
                  color={isWorryTimeLocked ? 'darkGray' : 'textPrimary'}
                >
                  {displayedFocusMinutes}분
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={18}
                  color={isWorryTimeLocked ? Colors.darkGray : Colors.black}
                />
              </View>
            </SettingRow>
          </View>
        </View>

        {/* ── 서비스 설정 섹션 ────────────────────────── */}
        <View style={styles.serviceSection}>
          <Text variant="title" style={styles.sectionTitle}>서비스 설정</Text>
          <View style={styles.itemList}>
            <ToggleRow
              label="알림"
              value={profile.notificationsEnabled}
              onValueChange={handleToggleNotifications}
            />
            <ToggleRow
              label="오디오"
              value={profile.audioEnabled}
              onValueChange={handleToggleAudio}
            />
          </View>
        </View>
      </ScrollView>

      {/* 시작 시간 바텀시트 — 공유 TimePickerSheet 사용 */}
      <TimePickerSheet
        visible={worryPickerOpen}
        initialHour={displayedWorryTime.hour}
        initialMinute={displayedWorryTime.minute}
        title="시작 시간을 선택해 주세요."
        onClose={() => setWorryPickerOpen(false)}
        onConfirm={(h, m) => {
          // picker 닫고 confirm modal 띄움 (실제 저장은 "변경하기" 누를 때)
          setWorryPickerOpen(false);
          setPendingChange({ kind: 'worry', hour: h, minute: m });
        }}
      />

      {/* 집중 시간 바텀시트 */}
      <FocusTimeSheet
        visible={focusPickerOpen}
        initial={displayedFocusMinutes}
        onClose={() => setFocusPickerOpen(false)}
        onConfirm={(m) => {
          setFocusPickerOpen(false);
          setPendingChange({ kind: 'focus', minutes: m });
        }}
      />

      {/* 변경 확인 모달 — figma 615:1325 (worry) / 615:1714 (focus) */}
      <ChangeConfirmModal
        change={pendingChange}
        onCancel={() => setPendingChange(null)}
        onConfirm={async () => {
          if (!pendingChange) return;
          if (pendingChange.kind === 'worry') {
            await handleWorryTimeChange(pendingChange.hour, pendingChange.minute);
          } else {
            await handleFocusChange(pendingChange.minutes);
          }
          setPendingChange(null);
        }}
      />

      {/* 걱정타임 진행 중 변경 시도 모달 — figma 399:504 */}
      <LockedModal
        visible={lockedModalOpen}
        onClose={() => setLockedModalOpen(false)}
        onGoWrite={() => {
          setLockedModalOpen(false);
          // 작성 화면으로 이동 — Home에서 active worry-time UI를 보여주거나 자동 진입
          navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
        }}
      />
    </SafeAreaView>
  );
}

// ─── 변경 확인 모달 (figma 615:1325 / 615:1714) ─────────────
// Card+Button+Text 재사용 — 두 케이스(worry/focus)를 같은 모달로 처리

interface ChangeConfirmModalProps {
  change: PendingChange | null;
  onCancel: () => void;
  onConfirm: () => void;
}

function ChangeConfirmModal({ change, onCancel, onConfirm }: ChangeConfirmModalProps) {
  // change가 null 이면 안 보임 (visible=false)
  const visible = change !== null;

  // 타이틀의 초록색 부분 — "오전 14:00" 또는 "30분"
  // 모달 표시는 콜론 양옆 공백 없이 ("04 : 25" → "04:25")
  let greenText = '';
  if (change?.kind === 'worry') {
    const f = formatTime12h(change.hour, change.minute);
    greenText = `${f.ampm} ${f.display.replace(/ : /g, ':')}`;
  } else if (change?.kind === 'focus') {
    greenText = `${change.minutes}분`;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.confirmBackdrop} onPress={onCancel} />
      <View style={styles.confirmCenter} pointerEvents="box-none">
        <Card variant="warning" style={styles.changeConfirmCard}>
          {/* title + subtitle (figma: col gap 11, w 272, items-start) */}
          <View style={styles.changeConfirmTitleGroup}>
            <Text variant="titleLarge" style={styles.changeConfirmTitleLine}>
              <Text variant="titleLarge" color="mainGreen">{greenText}</Text>
              {'으로 변경할까요?'}
            </Text>
            <Text variant="xsMedium" color="darkGray" style={styles.changeConfirmSubtitle}>
              변경한 시간은 다음 걱정타임부터 적용돼요.
            </Text>
          </View>

          {/* 버튼 행 (figma: row gap 8, h 43) */}
          <View style={styles.changeConfirmButtonRow}>
            <Button
              variant="secondary"
              size="md"
              label="그대로 두기"
              onPress={onCancel}
              style={styles.changeConfirmButton}
              textStyle={styles.changeConfirmButtonTextSecondary}
            />
            <Button
              variant="primary"
              size="md"
              label="변경하기"
              onPress={onConfirm}
              style={styles.changeConfirmButton}
              textStyle={styles.changeConfirmButtonTextPrimary}
            />
          </View>
        </Card>
      </View>
    </Modal>
  );
}

// ─── 진행 중 변경 차단 모달 (figma 399:504) ─────────────────
// 구조는 ChangeConfirmModal과 동일 (Card+Button+Text 재사용)
// 텍스트만 다름: 제목 "지금은 변경할 수 없어요!" + 본문 2줄 + 버튼 라벨

interface LockedModalProps {
  visible: boolean;
  onClose: () => void;
  onGoWrite: () => void;
}

function LockedModal({ visible, onClose, onGoWrite }: LockedModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.confirmBackdrop} onPress={onClose} />
      <View style={styles.confirmCenter} pointerEvents="box-none">
        <Card variant="warning" style={styles.changeConfirmCard}>
          {/* title + body (figma: col gap 11, w 272, items-start) */}
          <View style={styles.changeConfirmTitleGroup}>
            <Text
              variant="titleLarge"
              style={styles.changeConfirmTitleLine}
              numberOfLines={1}
            >
              지금은 변경할 수 없어요!
            </Text>
            {/* figma 본문 — 한글 폰트 width 때문에 \n 강제 안 하고 자연 wrap (2~3줄) */}
            <Text variant="xsMedium" color="darkGray" style={styles.changeConfirmSubtitle}>
              오늘의 걱정타임이 진행 중이에요. 걱정타임이 끝난 뒤에 시간을 변경할 수 있어요.
            </Text>
          </View>

          {/* 버튼 행 (figma: row gap 8, h 43) */}
          <View style={styles.changeConfirmButtonRow}>
            <Button
              variant="secondary"
              size="md"
              label="지금 작성하러 가기"
              onPress={onGoWrite}
              style={styles.changeConfirmButton}
              textStyle={styles.changeConfirmButtonTextSecondary}
            />
            <Button
              variant="primary"
              size="md"
              label="이따 다시 올게요"
              onPress={onClose}
              style={styles.changeConfirmButton}
              textStyle={styles.changeConfirmButtonTextPrimary}
            />
          </View>
        </Card>
      </View>
    </Modal>
  );
}

// ─── 헤더 ──────────────────────────────────────────────

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={onBack}
        style={styles.headerBack}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <ExitIcon width={24} height={24} />
      </TouchableOpacity>
      <Text variant="titleMedium">설정</Text>
      <View style={{ width: 24 }} />
    </View>
  );
}

// ─── 설정 행 (탭형, 카드 표면) ─────────────────────────

interface SettingRowProps {
  label: string;
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
}

function SettingRow({ label, children, onPress, disabled = false }: SettingRowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={disabled ? 1 : 0.7}
      style={{ alignSelf: 'stretch' }}
    >
      <Card variant="surface" style={[styles.itemRow, disabled && styles.itemRowDisabled]}>
        <Text variant="body" color={disabled ? 'darkGray' : 'textPrimary'}>
          {label}
        </Text>
        {children}
      </Card>
    </TouchableOpacity>
  );
}

// ─── 토글 행 ───────────────────────────────────────────

function ToggleRow({
  label, value, onValueChange,
}: { label: string; value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <Card variant="surface" style={styles.itemRow}>
      <Text variant="body">{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: Colors.darkGray, true: Colors.mainGreen }}
        thumbColor={Colors.white}
        ios_backgroundColor={Colors.darkGray}
      />
    </Card>
  );
}

// ─── 시작 시간 바텀시트 — 공유 컴포넌트 사용 (src/components/TimePickerSheet.tsx) ─────────

// ─── 집중 시간 바텀시트 ────────────────────────────────

interface FocusTimeSheetProps {
  visible: boolean;
  initial: number;
  onClose: () => void;
  onConfirm: (minutes: number) => void;
}

function FocusTimeSheet({ visible, initial, onClose, onConfirm }: FocusTimeSheetProps) {
  const [picked, setPicked] = useState(initial);

  useEffect(() => {
    if (visible) setPicked(initial);
  }, [visible, initial]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { gap: 84 }]}>
        <View style={styles.focusTopGroup}>
          <Text variant="titleLargeMid" style={styles.sheetTitle}>
            집중 시간을 선택해 주세요.
          </Text>

          <View style={styles.focusList}>
            {FOCUS_OPTIONS.map((mins) => {
              const selected = picked === mins;
              return (
                <TouchableOpacity
                  key={mins}
                  style={styles.focusRow}
                  onPress={() => setPicked(mins)}
                  activeOpacity={0.7}
                >
                  {selected ? (
                    <View style={styles.radioSelectedOuter}>
                      <View style={styles.radioSelectedInner} />
                    </View>
                  ) : (
                    <View style={styles.radioIdle} />
                  )}
                  <Text variant="titleMedium">{mins}분</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Button
          variant="primary"
          size="lg"
          label="완료"
          onPress={() => onConfirm(picked)}
          style={styles.confirmButton}
        />
      </View>
    </Modal>
  );
}

// ─── 헬퍼 ──────────────────────────────────────────────

function formatTime12h(hour24: number, minute: number) {
  const ampm = hour24 < 12 ? '오전' : '오후';
  let h12 = hour24 % 12;
  if (h12 === 0) h12 = 12;
  const display = `${String(h12).padStart(2, '0')} : ${String(minute).padStart(2, '0')}`;
  return { display, ampm };
}

// ─── 스타일 ────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.white },

  // ── 헤더 ──────────────────────────────────────────
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxl, // 20
    paddingTop: Spacing.xs, // 8
  },
  headerBack: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── 바디 ──────────────────────────────────────────
  body: { flex: 1 },
  bodyInner: {
    paddingHorizontal: Spacing.xxl, // 20
    paddingBottom: Spacing.xxxxxl, // 40
  },

  // ── 프로필 섹션 ──────────────────────────────────
  profileSection: {},
  profileNameRow: {
    height: 63,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: Spacing.xxl, // 20
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  profileHint: {
    marginTop: 11,
  },

  // ── 걱정타임 변경 섹션 ──────────────────────────
  worryTimeSection: {
    marginTop: Spacing.xxxxxl, // 40
    paddingBottom: Spacing.lg, // 14
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionTitle: {
    marginBottom: 8, // figma 615:1801 — title↔hint gap 8
  },
  sectionHint: {
    marginBottom: Spacing.md, // 12 — hint ↔ item-list 간격
    lineHeight: 15, // 10 * 1.5 (figma leading-[1.5])
  },
  lockedHint: {
    marginBottom: Spacing.md, // 12
  },
  itemList: {
    gap: Spacing.sm, // 10
  },

  // 공통 아이템 행 (Card surface + 레이아웃)
  itemRow: {
    height: 63,
    paddingHorizontal: Spacing.xxl, // 20
    paddingVertical: Spacing.sm, // 10
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemRowDisabled: { opacity: 0.5 },

  // 시작 시간 값 — 시간 텍스트 밑줄
  timeRowValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs, // 8
  },
  timeUnderline: {
    width: 53,
    height: 27,
    borderBottomWidth: 1,
    borderBottomColor: Colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 집중 시간 값
  focusRowValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs, // 4
  },

  // ── 서비스 설정 섹션 ──────────────────────────
  serviceSection: {
    marginTop: Spacing.xxxxxl, // 40
    paddingBottom: Spacing.lg, // 14
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  // ── 바텀시트 ──────────────────────────────────
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.backdrop,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 403,
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radii.lg, // 16
    borderTopRightRadius: Radii.lg, // 16
    paddingVertical: Spacing.xxxxl, // 32
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetTitle: {
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.xxxl, // 24
  },
  focusTopGroup: {
    alignSelf: 'stretch',
    alignItems: 'flex-start',
    gap: 25, // 피그마 onboarding-head 내부 gap (토큰화 안 된 값)
  },

  // 시간 칩 — 피그마: bg #f2f2f2, h 57, rounded 14.553, "00 : 00  오전"
  timeChip: {
    backgroundColor: Colors.lightGray200,
    height: 57,
    width: 232,
    borderRadius: 14.553, // 피그마 raw 값 (token 외)
    paddingLeft: 18.191,
    paddingRight: 12.128,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18.191,
  },
  timeChipText: {
    fontSize: 19.404, // 피그마 raw 값
    fontWeight: '500',
    color: Colors.black,
    letterSpacing: -0.3881,
  },

  // 집중 시간 라디오 리스트
  focusList: {
    height: 156,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.xxxl, // 24
  },
  focusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm, // 10
  },
  radioIdle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: Colors.radioIdle,
    backgroundColor: Colors.white,
  },
  radioSelectedOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: Colors.mainGreen,
    backgroundColor: Colors.white,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelectedInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.mainGreen,
  },

  // 완료 버튼 (Button 공유 컴포넌트에 width override)
  confirmButton: {
    width: 325,
  },

  // ── 변경 확인 모달 (figma 615:1325 / 615:1714) ─────
  // bg-white + rounded 12 + padding 24top/20others
  // figma는 warning Card 스타일과 살짝 다름 (rounded 20 → 12, padding 24/20)
  confirmBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.backdrop,
  },
  confirmCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  changeConfirmCard: {
    // warning Card 의 rounded 20/padding 24V/20H 를 figma 사양으로 override
    borderRadius: 12,
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'flex-start',
    // figma 폭 312 고정이면 한글 폰트 width 차이로 본문이 wrap → stretch + maxWidth 로
    alignSelf: 'stretch',
    maxWidth: 360,
  },
  changeConfirmTitleGroup: {
    // figma 사양은 w-272 고정이지만 한글 폰트가 더 넓어 타이틀 wrap 됨 → stretch 로 카드 전체 폭 사용
    alignSelf: 'stretch',
    alignItems: 'flex-start',
    gap: 11,
  },
  changeConfirmTitleLine: {
    // figma: 18px Semi_Bold, leading 1.5
    lineHeight: 27,
    alignSelf: 'stretch',
  },
  changeConfirmSubtitle: {
    lineHeight: 18, // 12 * 1.5
  },
  changeConfirmButtonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20, // figma: titleGroup ↔ buttonRow gap 20
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  changeConfirmButton: {
    // figma: 132×43, rounded 8
    width: 132,
    height: 43,
    borderRadius: 8,
  },
  changeConfirmButtonTextPrimary: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.26,
  },
  changeConfirmButtonTextSecondary: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.26,
    color: Colors.darkGray, // figma: #93a09a
  },
});
