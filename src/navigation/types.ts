// ─── 온보딩 스택 ─────────────────────────────────────────
export type OnboardingStackParamList = {
  OnboardingWelcome: undefined;
  OnboardingNickname: undefined;
  OnboardingSurvey: { nickname: string };
  OnboardingTime: {
    nickname: string;
    recommendedHour: number;
    recommendedMinute: number;
  };
  OnboardingPermission: {
    nickname: string;
    worryHour: number;
    worryMinute: number;
  };
};

// ─── 메인 스택 ───────────────────────────────────────────
export type RootStackParamList = {
  Onboarding: undefined;     // 온보딩 스택 전체
  Home: undefined;
  WorryTimeEntry: undefined;     // 5초 카운트다운 진입 화면 → WorryTime
  WorryTime: undefined;
  Memo: undefined;
  MemoComplete: undefined;       // 메모 작성 완료 후 안내 화면 (3초 자동 Home)
  // autoOpenFocusPicker: WorryCheckIn → "설정하러 가기" 진입 시 FocusTimeSheet 자동 열림
  Settings: { autoOpenFocusPicker?: boolean } | undefined;
  NicknameChange: undefined; // 설정 → 닉네임 변경
  Copywrite: undefined;
  NotWorryTime: undefined;   // "지금은 걱정타임이 아니에요" 바텀시트
  DelayPicker: undefined;    // 미루기 시간 picker (기존)
  DelayConfirm: undefined;   // "조금 이따 다시 만날까요?" — 2차 알림 액션 → 홈 위 모달
  DelaySet: {                // "HH:MM에 다시 만나요!" — 미루기 완료 후 모달
    hour: number;
    minute: number;
  };
  Reward: {                  // 걱정타임 완료 보상 화면 (3초 후 Home reset)
    from: 'worry' | 'copywrite';
    worryHour?: number;      // worry 진입 시 시간대별 멘트 분기에 사용
  };
  WorryCheckIn: {            // 걱정타임 2번째 완료 후 안내 모달 (1회성)
    from: 'worry';
    worryHour: number;
  };
  OnboardingGuide: undefined; // 온보딩 종료 직후 4 슬라이드 가이드 — 홈 위 transparentModal
};
