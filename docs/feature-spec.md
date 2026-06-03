# 기능정의서 (Feature Spec)

> 최종 업데이트: 2026-06-04
> 관련 문서: [걱정타임 변경 정책](./worry-time-change-policy.md) · [NFC/빌드 현황](./nfc-build-status.md)

이 문서는 화면 구성·유저 동선에 따라 구현된 기능을 정리한 기획/구현 참조 문서입니다.
새 협업자(사람 또는 Claude/Codex)가 코드를 읽기 전에 프로젝트 전체를 빠르게 파악하는 것을 목표로 합니다.

---

## 1. 개요

- **한 줄 정의**: 하루 한 번 정해둔 "걱정타임"에만 걱정을 쏟아내고, 그 외 시간엔 떠오른 걱정을 짧게 메모로만 적어두는 감정 정리 앱.
- **앱 이름**: 하루틈
- **핵심 컨셉**
  - **걱정타임** — 하루 1회, 사용자가 정한 시각에만 열리는 글쓰기 세션.
  - **휘발성 메모** — 평소 걱정은 메모로만 모아두고, 걱정타임 사이클이 끝나면 사라짐.
  - **꽃밭 보상** — 걱정타임을 완료할 때마다 꽃 1송이가 홈 언덕에 심어짐. 누적 기록이 곧 성장의 시각화.
  - **NFC 피규어 진입** — 물리 피규어 안 NFC 태그로 폰에 갖다 대면 앱이 열리며, 진행 중 개구리 캐릭터가 단계별 음성으로 안내.
- **플랫폼**: Android 우선 (NFC 피규어 연동 포함). iOS는 현 단계 미지원.
- **기술 스택**: React Native + Expo SDK 54, TypeScript, AsyncStorage(로컬 전용, 서버 없음), expo-notifications(로컬 알림), expo-av(오디오), react-native-nfc-manager, expo-keep-awake.

---

## 2. 유저 플로우

```
[최초 설치]
  온보딩 (환영 → 닉네임 → 걱정타임 설정 → 설문 → 권한) → 가이드 4 슬라이드 → 홈

[일상]
  홈(꽃밭 + 캐릭터) ──┬─ 걱정 떠오름 → 메모 작성(휘발성)
                      └─ 걱정타임 알림 대기

[걱정타임 시각 도달]  (1차 알림)
  알림 탭 / NFC 태그 / 앱 진입
    → 걱정타임 진입 → 글쓰기 타이머(집중시간, 화면 자동 꺼짐 차단)
        ├─ 완료 → 보상 화면 → 꽃/새싹 개화
        ├─ 미루기 → 재알림 대기 → 다시 진입
        └─ 미완료(시간 초과) → 잠금(빈자리 기록)

[걱정타임 전 자발적 작성]
  앞당기기 → 글쓰기 타이머 (동일)

[사이클 종료]
  메모 휘발 + 다음 사이클 알림 예약 + 잠금(다음 04:00에 자동 해제)
```

- **사이클 일자 경계**: 매일 **새벽 04:00**. 00:00~03:59는 전날 사이클로 취급.
- **앱 강제종료 후 재실행**: 진행 중이었던 걱정타임이면 Home 거치자마자 자동으로 WorryTime 화면으로 복귀, 카운트다운 이어감.

---

## 3. 화면 목록

| 화면 (route) | 역할 |
|---|---|
| `Onboarding` (navigator) | 최초 설정: 환영 / 닉네임 / 걱정타임 시각 / 설문 / 권한 요청 |
| `OnboardingGuide` | 첫 진입 사용 안내 4 슬라이드 (투명 모달) |
| `Home` | 메인. 꽃밭(월별 페이지네이션), 캐릭터, 걱정타임까지 카운트다운, 상태별 진입 분기 |
| `WorryTimeEntry` | 걱정타임 진입 전환 화면 (fade) |
| `WorryTime` | 글쓰기 타이머 본화면 (집중시간 진행, 화면 켜짐 유지) |
| `Memo` | 휘발성 메모 작성 |
| `MemoComplete` | 메모 저장 완료 안내 |
| `Copywrite` | 필사 — 걱정이 없을 때 문장 따라 적기 |
| `NotWorryTime` | "지금은 걱정타임이 아니에요" 안내 시트 (투명 모달) |
| `DelayPicker` / `DelayConfirm` / `DelaySet` | 미루기: 시각 선택 / 확인 / 설정 시트 |
| `WorryCheckIn` | 2번째 걱정타임 완료 시 1회 노출되는 점검 안내 시트 |
| `FlowerBloom` | 꽃/새싹 개화 연출 (오늘의 꽃) |
| `Reward` | 완료 보상 화면 |
| `Settings` / `NicknameChange` | 설정 / 닉네임 변경 |
| `Splash` | 앱 시작 시 표시 (자체 splash 화면) |

---

## 4. 기능 상세

### 4.1 걱정타임 상태머신

`src/timer/stateMachine.ts` — `resolveState(timerState, now, worryTime)` 가 앱 진입/폴링 시 현재 상태를 계산.

| 상태 | 의미 |
|---|---|
| `idle` | 걱정타임 시간 아님, 잠금 없음 |
| `active` | 걱정타임 시각 도달, 아직 시작 안 함 |
| `inProgress` | 글쓰기 타이머 진행 중 |
| `delayed` | 미루기 선택 후 재알림 대기 |
| `advanced` | 앞당기기 진행 중 (걱정타임 전 자발적 작성) |
| `locked` | 이번 사이클 잠금 (완료 후 또는 미완료) |
| `completed` | 이번 사이클 정상 완료 |

**시간 창 (`worryTimeWindow.ts`)**
- 1차 알림: 사용자가 설정한 `worryTime`
- 2차 알림: 1차 + **30분** — 액션 버튼 (걱정타임 미루기 / 지금 작성하기) 부착
- 잠금: 2차 + **60분** → **1차 + 90분**이 걱정타임 마감
- 잠금은 다음 **사이클 일자(04:00)** 에 자동 해제

**의미적 종료 판단 (`hasTodayCycleEnded`)**
- `locked`/`completed` 상태면 종료
- `idle` 상태에서 오늘 잠금 시각이 이미 지났으면 종료
- **새벽 예외 (00:00~03:59)**: 첫 빌드라 어제 cycle 잠금 알림이 발화 못 했어도, 어제 cycle 의 잠금 시각이 지났으면 종료로 간주. 단 worryTime 이 **04:00 미만(새벽)** 이면 "오늘 worryTime 이 곧" 으로 해석해 예외 처리.

### 4.2 글쓰기 타이머

`src/screens/WorryTimeScreen.tsx`

- **집중시간**: `focusMinutes` (15 / 20 / 25 / 30분, 기본 20)
- **시작**: `startTimer()` 가 `startedAt`만 저장 → 복귀 시 `now - startedAt`으로 경과 계산 (앱이 꺼져도 정확)
- **작성 완료 버튼**: 경과 **10분(`COMPLETE_THRESHOLD_SEC`)** 이상이거나 타이머 종료 시 노출. 버튼 탭으로 완료 처리.
- **종료 연출**: 경과 ≥ `totalSec` 도달 시 1회 진동 + BGM 세션 부드럽게 종료
- **화면 꺼짐 차단**: `useKeepAwake()` 로 진행 중엔 자동으로 꺼지지 않음 (화면 이탈 시 자동 해제)
- **뒤로가기 차단**: `beforeRemove` 로 GO_BACK/POP 액션 차단 (스와이프·하드웨어 백 무시). `replace`/`reset`은 허용.
- **복귀 흐름**: 앱 강제종료된 후 다시 열면 HomeScreen 이 `inProgress` 감지 → 자동으로 `navigation.navigate('WorryTime')` 로 복귀 → 카운트다운 이어감 (시작 음원 재생 안 함)

### 4.3 메모 적립 & 휘발 정책

- 평소 떠오른 걱정을 짧게 적어 **현재 사이클 메모 배열**에 누적
- **상한**: 사이클당 최대 **100개** (`MAX_MEMOS_PER_CYCLE`). 초과 시 안내 후 저장 거부
- **휘발 시점**: 걱정타임 **완료** 또는 **잠금** 시 `resetMemos()` 호출
- **놓침 처리**: 걱정타임을 놓친 경우(잠금)에도 메모 즉시 휘발 — "휘발"이 컨셉의 본질
- **인지 방식**: 별도 사용자 알림 없이 조용히 삭제

### 4.4 미루기 / 앞당기기

`src/timer/timerService.ts`

- **미루기**: 재알림 시각 선택 → `delayedUntil`. 재알림 + **30분** 후 잠금. **한 사이클 1회만**.
  - 선택 범위: `now + 1분` ~ 다음 **04:00**
  - 불가 조건: 이미 미루기/앞당기기 사용, `worryTime`이 04:00 설정, picker 범위 없음
  - ⚠️ 현재 `MIN_DELAY_OFFSET_MIN = 1`분 (테스트값, 원래 10분) — 배포 전 10으로 복귀 필요
- **앞당기기**: 걱정타임 시각 전에 자발적 시작. 이번 사이클의 1·2차·잠금 알림 모두 취소
- 미루기/앞당기기로 완료한 날은 꽃이 아닌 **새싹(`sprout`)** 으로 기록

### 4.5 알림

`src/notifications/scheduler.ts`, `App.tsx`

- **로컬 알림만** 사용 (서버 푸시 없음)
- 한 사이클당: **1차 → 2차(+30분) → 잠금 트리거(+60분)**
- **액션 버튼 부착 알림**: 2차 알림, 미루기 재알림
  - [걱정타임 미루기] → DelayConfirm → DelayPicker
  - [지금 작성하기] → Home (active)
- 미루기 시: 기존 사이클 알림 취소 → 재알림 + 미루기 잠금 예약
- 알림 응답 핸들러: 현재 상태를 **먼저** 확인 → 사이클 종료면 "걱정타임 끝났어요" 모달, 그 외 액션별 분기
- **시간 변경 정책**: 변경한 걱정타임/집중시간은 **다음 사이클부터** 적용 (`pending` 필드 → `applyPendingProfile()`)

### 4.6 필사 출력

- 걱정이 없을 때 제시되는 문장을 따라 적는 대안 활동
- **중복 방지**: 본 콘텐츠 ID를 `copywrite:seenIds`에 누적 → 한 바퀴 후 리셋
- BGM 재생: 걱정타임 화면과 동일 정책 (audioEnabled 토글, 세션당 트랙 1개 랜덤)

### 4.7 꽃밭 / 꽃 추가

`src/components/FlowerGarden.tsx`, `src/screens/HomeScreen.tsx`, `src/timer/flowerCycle.ts`

- 걱정타임 완료 시 하루 1개 **`DayRecord`** 저장 (`record:YYYY-MM-DD`)
- `status`: `flower`(정상 완료) / `sprout`(미루기·앞당기기) / `empty`(미완료·놓침)
- `flowerType`: 1~7 (정상 완료 시 7종 순환 추첨, `flower:cycle:used`로 같은 색 인접 회피)
- `position`: 언덕 안 좌표 — 날짜 기반 deterministic (월 seed → day별 unique slot)
- **꽃밭 표시**: 홈에서 월 단위 페이지네이션. 좌우 chevron 으로 이동.
- **저장·표시 정책**: 기록은 **영구 저장**, 꽃밭 열람은 **최근 6개월(이번 달 포함)** 으로 제한
  - 미래 달·6개월 초과 과거는 chevron 비활성화 (회색)
  - 이유: 데이터는 작아 영구 보존이 저렴하고, 표시 범위만 제한해 UX·성능 확보. 삭제는 비가역이라 지양
- **꽃 자산**: flower 1~6 (Lottie idle/show) + flower 7 (`seed_idle/show`, 새싹 모양 노란 꽃) + sprout (`sprout_idle/show`, 잎 두 장 새싹)

### 4.8 NFC 진입 + 개구리 음원

상세: [nfc-build-status.md](./nfc-build-status.md)

- 물리 피규어 내 NFC 태그(NTAG213, URL `https://worrytime.app/start`) → Android 단말 태그
- **진입 방식**
  - 포그라운드: `App.tsx` 의 `NfcManager` listener 가 직접 잡음 → `handleNfcTagEntry`
  - 백그라운드/종료: deep link URL → Android 인텐트 디스패치 → 우리 앱 launch → `Linking.getInitialURL` → 동일 핸들러
  - 첫 태그 시 "앱 선택" chooser 한 번 노출 (autoVerify=false, 가상 도메인이라 정상 동작) → "하루틈 + 항상" 선택 시 이후 자동
- **상태별 분기 (`src/nfc/nfcEntry.ts`)**

| 상태 | NFC 태그 결과 |
|---|---|
| `active` / `inProgress` / `advanced` | `setNfcSession(true)` → WorryTimeEntry → WorryTime 진입 |
| `delayed` | GlobalToast "○○시에 다시 만나요" + 홈 유지 (의도된 안내만) |
| `idle` | `NotWorryTime` 시트 (`fromNfc:true` param). "지금 작성할래요" 시점에 NFC 세션 표시 |
| 사이클 종료 (`hasTodayCycleEnded`) | Home + showWorryEnded 모달 |

- **개구리 음원 3종** — NFC 진입 세션에서만 재생, BGM 토글과 **독립**
  - **시작 ("준비해볼까요?")** — WorryTimeScreen 마운트 + `startedAt` 설정 직후, **fresh start 일 때만** (resume 시엔 skip)
  - **5분 남음 ("남은 시간동안 천천히 생각해봐요")** — 남은 5분 시점 1회. **BGM 일시 정지 → 멘트 끝까지 await → BGM 재개** (같은 트랙으로)
  - **종료 ("끝났어요. 고민을 내려놓아요")** — 타이머 만료 시 1회. 이 시점엔 BGM 세션이 이미 자동 종료
- **시작 음원 ↔ BGM 순서**: NFC 세션 + fresh start 시, 시작 음원 끝까지 await → 그 뒤 BGM 시작. 일반 진입 / resume 시엔 즉시 BGM
- **NFC 세션 플래그**: AsyncStorage (`nfc_session`). `completeTimer` / `lockCycle` 종료 시 reset

### 4.9 BGM / 오디오

`src/audio/bgm.ts`, `src/audio/frog.ts`

- **BGM**: `bgm` 타입(`classic` / `whitenoise` / `none`) + `audioEnabled` 토글
- **사용처**: 걱정타임 화면, 필사 화면 (동일 정책)
- **트랙 선택**: 한 세션당 1개 랜덤 고정 (토글 OFF→ON 해도 같은 트랙). 세션 종료 시 다음을 위해 reset
- **개구리 음원 독립성**: `audioEnabled` 토글의 영향을 받지 않음 (BGM 꺼져 있어도 NFC 세션이면 개구리 멘트 정상 재생)
- **5분 멘트 시점**: BGM 일시 정지 → 개구리 멘트 → 같은 BGM 트랙 재개 (`playSound` 가 Promise 끝나면 resolve)

---

## 5. 데이터 모델 (AsyncStorage)

서버 없는 **로컬 전용** 저장. 키 정의: `src/storage/keys.ts`, 타입: `src/storage/types.ts`.

| 키 | 내용 | 보존/상한 |
|---|---|---|
| `schemaVersion` | 스키마 버전 (마이그레이션용) | 영구 |
| `user:profile` | 닉네임, 걱정타임, 집중시간, BGM, 토글, pending 변경값 | 영구 (단일) |
| `timer:state` | 사이클 상태(잠금/시작시각/알림 ID 등) | 영구 (단일) |
| `memo:current` | 현재 사이클 메모 배열 | **휘발** — 사이클 종료 시 삭제, **최대 100개/사이클** |
| `record:YYYY-MM-DD` | 하루 기록(꽃/새싹/빈자리) | **영구 저장, 꽃밭은 최근 6개월만 표시** |
| `progress:completedCount` | 완료 누적 카운터 (0~7) | 영구 (단일) |
| `copywrite:seenIds` | 본 필사 콘텐츠 ID | 영구, 한 바퀴 후 리셋 |
| `worry:completeCount` | 걱정타임 누적 완료 수 (점검 시트 트리거) | 영구 (단일) |
| `flower:cycle:used` | 이번 7개 사이클에서 사용한 꽃 type | 7개 채우면 리셋 |
| `nfc_session` | NFC 진입 세션 여부 ('1' or 없음) | 사이클 종료 시 reset |

**핵심 타입**
- `UserProfile`: `nickname`, `worryTime{hour,minute}`, `focusMinutes`, `bgm`, `notificationsEnabled`, `audioEnabled`, `pendingWorryTime?`, `pendingFocusMinutes?`
- `DayRecord`: `status('flower'|'sprout'|'empty')`, `completedAt`, `isDelayed`, `isAdvanced`, `flowerType?(1~7)`, `position?{x,y}`
- `MemoEntry`: `text`, `createdAt`
- `TimerState`: 잠금/시작/미루기 플래그 + 알림 ID 4종

---

## 6. 설정

`src/screens/SettingsScreen.tsx`, `NicknameChangeScreen.tsx`

| 항목 | 비고 |
|---|---|
| 닉네임 | 공백 포함 최대 12자 |
| 걱정타임 시각 | 변경 시 **다음 사이클부터** 적용 (locked 상태에선 즉시 적용 + 알림 재예약) |
| 집중시간 | 15 / 20 / 25 / 30분, 다음 사이클부터 적용 |
| 알림 토글 | `notificationsEnabled` |
| BGM 토글 / 타입 | `audioEnabled` + `bgm`. 개구리 음원에는 영향 없음 |

> 변경값은 즉시 active 필드를 덮어쓰지 않고 `pending`에 저장 → 다음 사이클 시작 시 promote. "변경은 내일부터" 정책을 일관 유지하고 무한 미루기를 막기 위함.

---

## 7. 빌드 / 배포

### 빌드 환경
- **EAS Build** (클라우드) 사용. `eas.json` 의 `development` / `preview` / `production` 프로필
- **Development build**: Metro 서버 필요, 핫리로드, Debug Panel 노출 (`__DEV__=true`)
- **Preview build**: APK 단독 실행, 사용자 배포용 (`__DEV__=false`, Debug Panel/더미 seed 자동 숨김)
- 패키지명: `com.anonymous.Social_Impact`

### 앱 자산
- **앱 이름**: "하루틈" (`app.json` `expo.name`)
- **아이콘**: `assets/icon.png` (legacy) + `assets/adaptive-icon.png` (Android adaptive, 캐릭터를 안전 영역 68%에 배치 — 마스크 클리핑 방지)
- **NFC 권한**: `android.permission.NFC` + intent filter `https://worrytime.app/start` (autoVerify=false → 첫 태그 시 chooser, 사용자가 "하루틈 + 항상" 선택 후 자동 라우팅)

### 배포 흐름
1. `eas build -p android --profile preview` → APK 링크
2. 테스터에게 APK 링크 전달 (카톡/메일)
3. 각자 다운로드 + 설치 → Metro 서버 없이 단독 실행
4. NFC 태그 첫 사용 시 chooser 안내 필요

### 배포 전 체크리스트
- [ ] `MIN_DELAY_OFFSET_MIN`을 10으로 복귀 (현재 테스트값 1분)
- [ ] 4월 더미 seed가 `__DEV__` only 인지 확인 (자동)
- [ ] Debug Panel이 preview 에서 안 보이는지 (자동)
- [ ] 앱 아이콘/이름 정상 노출
- [ ] NFC 태그에 URL 정확히 쓰여 있는지 (`https://worrytime.app/start`)
