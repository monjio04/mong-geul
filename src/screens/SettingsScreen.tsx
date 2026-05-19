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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import {
  getUserProfile, saveUserProfile,
  getTimerState, saveTimerState,
} from '../storage/storage';
import type { UserProfile, WorkerState } from '../storage/types';
import { scheduleCycle, cancelCycleNotifications } from '../notifications/scheduler';
import { resolveState } from '../timer/stateMachine';
import { Button, Card, Text } from '../components/ui';
import { Colors, Radii, Spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const FOCUS_OPTIONS = [15, 20, 25, 30];

export default function SettingsScreen({ navigation }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [appState, setAppState] = useState<WorkerState>('idle');
  const [worryPickerOpen, setWorryPickerOpen] = useState(false);
  const [focusPickerOpen, setFocusPickerOpen] = useState(false);

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

  const isWorryTimeLocked =
    appState === 'active' ||
    appState === 'inProgress' ||
    appState === 'advanced' ||
    appState === 'delayed';

  const handleLockedAttempt = () => {
    Alert.alert(
      '지금은 변경할 수 없어요',
      '걱정 타임이 진행 중이거나 미루기 대기 중이에요.\n끝난 후에 변경해주세요.',
    );
  };

  if (!profile) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <Header onBack={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  const formattedTime = formatTime12h(profile.worryTime.hour, profile.worryTime.minute);

  // ─── 핸들러 ────────────────────────────────────────────

  const handleWorryTimeChange = async (hour: number, minute: number) => {
    const updated: UserProfile = { ...profile, worryTime: { hour, minute } };
    await saveUserProfile(updated);
    setProfile(updated);

    const state = await getTimerState();
    await cancelCycleNotifications({
      primaryNotifId: state.primaryNotifId,
      secondaryNotifId: state.secondaryNotifId,
      lockNotifId: state.lockNotifId,
    });
    if (updated.notificationsEnabled) {
      const { primaryNotifId, secondaryNotifId, lockNotifId } = await scheduleCycle(updated.worryTime);
      await saveTimerState({
        ...state,
        primaryNotifId,
        secondaryNotifId,
        lockNotifId,
      });
    }
  };

  const handleFocusChange = async (minutes: number) => {
    const updated: UserProfile = { ...profile, focusMinutes: minutes };
    await saveUserProfile(updated);
    setProfile(updated);
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
          <Text variant="caption" color="darkGray" style={styles.profileHint}>
            데이터를 이 기기에만 안전하게 저장하고 있습니다.
          </Text>
        </View>

        {/* ── 걱정타임 변경 섹션 ──────────────────────── */}
        <View style={styles.worryTimeSection}>
          <Text variant="title" style={styles.sectionTitle}>걱정타임 변경</Text>
          {isWorryTimeLocked && (
            <Text variant="xs" color="darkGray" style={styles.lockedHint}>
              걱정 타임이 진행 중이라 변경할 수 없어요. 끝난 후에 변경해주세요.
            </Text>
          )}
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
                  {profile.focusMinutes}분
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

      {/* 시작 시간 바텀시트 */}
      <WorryTimeSheet
        visible={worryPickerOpen}
        initialHour={profile.worryTime.hour}
        initialMinute={profile.worryTime.minute}
        onClose={() => setWorryPickerOpen(false)}
        onConfirm={(h, m) => {
          handleWorryTimeChange(h, m);
          setWorryPickerOpen(false);
        }}
      />

      {/* 집중 시간 바텀시트 */}
      <FocusTimeSheet
        visible={focusPickerOpen}
        initial={profile.focusMinutes}
        onClose={() => setFocusPickerOpen(false)}
        onConfirm={(m) => {
          handleFocusChange(m);
          setFocusPickerOpen(false);
        }}
      />
    </SafeAreaView>
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
        <Ionicons name="arrow-back" size={24} color={Colors.black} />
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

// ─── 시작 시간 바텀시트 ────────────────────────────────

interface WorryTimeSheetProps {
  visible: boolean;
  initialHour: number;
  initialMinute: number;
  onClose: () => void;
  onConfirm: (hour: number, minute: number) => void;
}

function WorryTimeSheet({
  visible, initialHour, initialMinute, onClose, onConfirm,
}: WorryTimeSheetProps) {
  const [picked, setPicked] = useState(() => {
    const d = new Date();
    d.setHours(initialHour, initialMinute, 0, 0);
    return d;
  });
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);

  useEffect(() => {
    if (visible) {
      const d = new Date();
      d.setHours(initialHour, initialMinute, 0, 0);
      setPicked(d);
      if (Platform.OS === 'android') setShowAndroidPicker(true);
    }
  }, [visible, initialHour, initialMinute]);

  const formatted = formatTime12h(picked.getHours(), picked.getMinutes());

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { gap: 104 }]}>
        <Text variant="titleLargeMid" style={styles.sheetTitle}>
          시작 시간을 선택해 주세요.
        </Text>

        {Platform.OS === 'ios' ? (
          <DateTimePicker
            value={picked}
            mode="time"
            display="spinner"
            onChange={(_, date) => date && setPicked(date)}
          />
        ) : (
          <>
            <TouchableOpacity
              style={styles.timeChip}
              onPress={() => setShowAndroidPicker(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.timeChipText}>{formatted.display}</Text>
              <Text style={styles.timeChipText}>{formatted.ampm}</Text>
            </TouchableOpacity>
            {showAndroidPicker && (
              <DateTimePicker
                value={picked}
                mode="time"
                is24Hour={false}
                display="default"
                onChange={(event, date) => {
                  setShowAndroidPicker(false);
                  if (event.type === 'set' && date) setPicked(date);
                }}
              />
            )}
          </>
        )}

        <Button
          variant="primary"
          size="lg"
          label="완료"
          onPress={() => onConfirm(picked.getHours(), picked.getMinutes())}
          style={styles.confirmButton}
        />
      </View>
    </Modal>
  );
}

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
    marginBottom: Spacing.lg, // 14
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
});
