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
  OnboardingGuide: {
    nickname: string;
    worryHour: number;
    worryMinute: number;
  };
};

// ─── 메인 스택 ───────────────────────────────────────────
export type RootStackParamList = {
  Onboarding: undefined;     // 온보딩 스택 전체
  Home: undefined;
  WorryTime: undefined;
  Memo: undefined;
  Settings: undefined;
  NicknameChange: undefined; // 설정 → 닉네임 변경
  Copywrite: undefined;
  NotWorryTime: undefined;   // "지금은 걱정타임이 아니에요" 바텀시트
  DelayPicker: undefined;    // 미루기 시간 picker
};
