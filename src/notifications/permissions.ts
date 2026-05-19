import * as Notifications from 'expo-notifications';
import { Platform, Linking } from 'react-native';

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function requestExactAlarmPermission(): Promise<void> {
  // Android 12+ SCHEDULE_EXACT_ALARM / Android 14+ USE_EXACT_ALARM
  // expo-notifications가 내부적으로 처리하지만, 명시적 요청이 필요한 경우 아래 딥링크 활용
  if (Platform.OS === 'android') {
    // 알림 설정 화면 열기 (배터리 최적화 제외 안내 병행)
    // 실제 USE_EXACT_ALARM 요청은 app.json의 permissions 항목에서 선언으로 처리
  }
}

/** 배터리 최적화 제외 설정 화면으로 이동 */
export async function openBatteryOptimizationSettings(): Promise<void> {
  if (Platform.OS === 'android') {
    await Linking.openSettings();
  }
}

/** 알림 권한 + 정확 알람 권한 한번에 요청 */
export async function requestAllPermissions(): Promise<{ notif: boolean }> {
  const notif = await requestNotificationPermission();
  await requestExactAlarmPermission();
  return { notif };
}

/** 현재 알림 권한 상태 확인 */
export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  const { status } = await Notifications.getPermissionsAsync();
  return status as 'granted' | 'denied' | 'undetermined';
}
