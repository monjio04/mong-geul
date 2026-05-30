# 기능정의서 (Feature Spec)

> 최종 업데이트: 2026-05-29
> 관련 문서: [걱정타임 변경 정책](./worry-time-change-policy.md) · [NFC/빌드 현황](./nfc-build-status.md)

이 문서는 화면 구성·유저 동선에 따라 구현된 기능을 정리한 기획/구현 참조 문서입니다.
새 협업자(사람 또는 Claude/Codex)가 코드를 읽기 전에 프로젝트 전체를 빠르게 파악하는 것을 목표로 합니다.

---

## 1. 개요

- **한 줄 정의**: 하루 한 번 정해둔 "걱정타임"에만 걱정을 쏟아내고, 그 외 시간엔 떠오른 걱정을 짧게 메모로만 적어두는 감정 정리 앱.
- **핵심 컨셉**
  - **걱정타임** — 하루 1회, 사용자가 정한 시각에만 열리는 글쓰기 세션.
  - **휘발성 메모** — 평소 걱정은 메모로만 모아두고, 걱정타임 사이클이 끝나면 사라짐(휘발).
  - **꽃밭 보상** — 걱정타임을 완료할 때마다 꽃 1송이가 홈 언덕에 심어짐. 누적 기록이 곧 성장의 시각화.
- **플랫폼**: Android 우선 (NFC 피규어 연동 포함). iOS는 현 단계 미지원.
- **기술 스택**: React Native + Expo SDK 54, TypeScript, AsyncStorage(로컬 전용, 서버 없음), expo-notifications(로컬 알림), expo-av(오디오).

---

## 2. 유저 플로우

```
[최초 설치]
  온보딩 (환영 → 닉네임 → 걱정타임 설정 → 설문 → 권한) → 가이드 → 홈

[일상]
  홈(꽃밭 + 캐릭터) ──┬─ 걱정 떠오름 → 메모 작성(휘발성)
                      └─ 걱정타임 알림 대기

[걱정타임 시각 도달]  (1차 알림)
  알림 탭 / NFC 태그 / 앱 진입
    → 걱정타임 진입 → 글쓰기 타이머(집중시간)
        ├─ 완료 → 꽃/새싹 심기 → 보상 화면
        ├─ 미루기 → 재알림 대기 → 다시 진입
        └─ 미완료(시간 초과) → 잠금(빈자리 기록)

[걱정타임 전 자발적 작성]
  앞당기기 → 글쓰기 타이머 (동일)

[사이클 종료]
  메모 휘발 + 다음 사이클 알림 예약 + 잠금(다음 04:00에 자동 해제)
```

- **사이클 일자 경계**: 매일 **새벽 04:00**. 00:00~03:59는 전날 사이클로 취급.
- 상세 상태 전이는 [4.1 걱정타임 상태머신](#41-걱정타임-상태머신) 참조.

---

## 3. 화면 목록

| 화면 (route) | 역할 |
|---|---|
| `Onboarding` (navigator) | 최초 설정: 환영 / 닉네임 / 걱정타임 시각 / 설문 / 권한 요청 |
| `OnboardingGuide` | 첫 진입 사용 안내 (투명 모달) |
| `Home` | 메인. 꽃밭(월별), 캐릭터, 걱정타임까지 카운트다운, 상태별 진입 분기 |
| `WorryTimeEntry` | 걱정타임 진입 전환 화면 (fade) |
| `WorryTime` | 글쓰기 타이머 본화면 (집중시간 진행) |
| `Memo` | 휘발성 메모 작성 |
| `MemoComplete` | 메모 저장 완료 안내 |
| `Copywrite` | 필사 — 걱정이 없을 때 문장 따라 적기 |
| `NotWorryTime` | "지금은 걱정타임이 아니에요" 안내 시트 (투명 모달) |
| `DelayPicker` / `DelayConfirm` / `DelaySet` | 미루기: 시각 선택 / 확인 / 설정 시트 |
| `WorryCheckIn` | 2번째 걱정타임 완료 시 1회 노출되는 점검 안내 시트 |
| `FlowerBloom` | 꽃/새싹 개화 연출 (오늘의 꽃) |
| `Reward` | 완료 보상 화면 |
| `Settings` / `NicknameChange` | 설정 / 닉네임 변경 |

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

**시간 창 (`src/timer/worryTimeWindow.ts`)**
- 1차 알림: 사용자가 설정한 `worryTime`.
- 2차 알림: 1차 + **30분**.
- 잠금: 2차 + **60분** → 즉 **1차 + 90분**이 걱정타임 마감.
- 걱정타임 활성 창(active) = `[1차, 잠금)` = 90분.
- 잠금은 다음 **사이클 일자(04:00)** 에 자동 해제.

**의미적 종료 판단**: `hasTodayCycleEnded()` — `locked`/`completed`이거나, `idle`인데 오늘 잠금 시각이 이미 지난 경우(사용자가 그냥 놓침). 알림 핸들러의 stale 액션 차단, 홈 좌측 박스 탭 분기 등에 사용.

### 4.2 글쓰기 타이머

`src/screens/WorryTimeScreen.tsx`

- **집중시간**: `focusMinutes` (15 / 20 / 25 / 30분, 기본 20). `totalSec = focusMinutes × 60`.
- **시작**: `startTimer()` 가 `startedAt`만 저장 → 복귀 시 `now - startedAt`으로 경과 계산 (앱이 꺼져도 정확).
- **작성 완료 버튼**: 경과 **10분(`COMPLETE_THRESHOLD_SEC`)** 이상이거나 타이머 종료 시 노출. 버튼을 눌러야 완료 처리.
- **종료 연출**: 경과 ≥ `totalSec` 도달 시 1회 진동 + BGM 세션 부드럽게 종료(알림음 없음).
- **개구리 음원**(NFC 세션 한정): 5분 남은 시점 1회, 종료 시점 1회 — [4.8 NFC](#48-nfc-진입--개구리-음원) 참조.

### 4.3 메모 적립 & 휘발 정책

`src/storage/storage.ts` (`memo:current`)

- 평소 떠오른 걱정을 짧게 적어 **현재 사이클 메모 배열**에 누적 (`addMemo`).
- **상한**: 사이클당 최대 **100개** (`MAX_MEMOS_PER_CYCLE`). 초과 시 안내 후 저장 거부 — 무한 누적 방지.
- **휘발 시점**: 걱정타임 **완료(`completeTimer`)** 또는 **잠금(`lockCycle`)** 시 `resetMemos()`로 삭제.

**정책 결정 (2026-05-29)**
- 걱정타임을 **놓친 경우에도 그날 바로 휘발** (별도 보관 기간 없음) — "휘발"이 컨셉의 본질.
- 휘발에 대한 **별도 사용자 알림 없음** (조용히 삭제). 추후 디자인 확정 시 휘발 연출/안내 추가 가능.

### 4.4 미루기 / 앞당기기

`src/timer/timerService.ts`, `worryTimeWindow.ts`

- **미루기(delay)**: 걱정타임을 나중으로 재알림. 재알림 시각 선택 → `delayedUntil`. 재알림 + **30분** 후 잠금.
  - 선택 범위: `now + 최소 오프셋` ~ 다음 **04:00**.
  - 불가 조건: 이미 미루기/앞당기기 사용, `worryTime`이 04:00 설정, 선택 가능 범위 없음.
  - ⚠️ **현재 `MIN_DELAY_OFFSET_MIN = 1`분 (테스트값, 원래 10분)** — 배포 전 10으로 복귀 필요.
- **앞당기기(advance)**: 걱정타임 시각 전에 자발적으로 글쓰기 시작. 이번 사이클의 1·2차·잠금 알림 모두 취소.
- 미루기/앞당기기로 완료한 날은 꽃이 아닌 **새싹(`sprout`)** 으로 기록.

### 4.5 알림

`src/notifications/scheduler.ts`, `App.tsx`

- **로컬 알림만** 사용 (서버 푸시 없음 — Expo Go SDK 53+ 원격 푸시 미지원).
- 한 사이클당: **1차 알림 → 2차 알림(+30분) → 잠금 트리거(+60분)**.
- 미루기 시: 기존 사이클 알림 취소 후 **재알림 + 미루기 잠금** 예약.
- 알림 응답 핸들러: 현재 상태를 먼저 확인 → 사이클 종료면 "걱정타임 끝났어요" 모달, `DELAY` 액션은 `active`에서만 유효(그 외 stale → 홈).
- **시간 변경 정책**: 변경한 걱정타임/집중시간은 즉시가 아니라 **다음 사이클부터** 적용(`pending` 필드 → `applyPendingProfile()`로 promote). 무한 미루기 차단. 상세: [worry-time-change-policy.md](./worry-time-change-policy.md).

### 4.6 필사 출력

`src/screens/CopywriteScreen.tsx`, `storage.ts`

- 걱정이 없을 때 제시되는 문장을 따라 적는 대안 활동.
- **중복 방지**: 본 콘텐츠 ID를 `copywrite:seenIds`에 누적 → 다음 진입 시 제외하고 랜덤 선택. 전부 본 후엔 리셋(한 바퀴 순환).

### 4.7 꽃밭 / 꽃 추가

`src/components/FlowerGarden.tsx`, `src/screens/HomeScreen.tsx`, `src/timer/flowerCycle.ts`

- 걱정타임 완료 시 하루 1개 **`DayRecord`** 저장 (`record:YYYY-MM-DD`).
  - `status`: `flower`(정상 완료) / `sprout`(미루기·앞당기기 완료) / `empty`(미완료·놓침).
  - `flowerType`: 1~7 (정상 완료 시 7종 순환 추첨, `flower:cycle:used`로 같은 색 인접 회피).
  - `position`: 언덕 안 좌표 — 날짜 기반 deterministic(월 seed로 day마다 다른 슬롯).
- **꽃밭 표시**: 홈에서 **월 단위 페이지네이션** (한 번에 한 달치 `getMonthRecords`). chevron으로 이동.
- **저장·표시 정책 (2026-05-29)**: 기록은 **영구 저장**, 꽃밭 열람은 **최근 1년(이번 달 포함 12개월)** 으로 제한. 미래 달·1년 초과 과거는 chevron 비활성화.
  - 이유: 데이터는 작아(하루 1개 작은 record) 영구 보존이 저렴하고, 표시 범위만 제한해 UX/성능 확보. 삭제는 비가역이라 지양.
  - ❓ **멘토 확인 대기**: 보존 상한 우려가 메모 중심인지, 꽃에도 적용인지. 답변에 따라 표시 기간 조정 가능.

### 4.8 NFC 진입 + 개구리 음원

상세: [nfc-build-status.md](./nfc-build-status.md)

- 물리 피규어 내 NFC 태그(NTAG213)를 Android 단말에 태그 → 앱 실행 → **걱정타임 컨텍스트로 진입**.
- 상태별 분기: `active`/`inProgress`/`advanced` → 걱정타임 진입 + 시작 음원 / `idle` → "걱정타임 아님" 시트 / `delayed` → 토스트 / 사이클 종료 → "끝났어요" 모달.
- **개구리 음원 3종** (시작 / 5분 남음 / 종료): **NFC로 진입한 세션에서만** 재생. 일반 진입은 무음.
- BGM 토글(`audioEnabled`)과 **독립** — BGM이 꺼져도 개구리 음원은 재생.

### 4.9 BGM / 오디오

`src/audio/bgm.ts`, `src/audio/frog.ts`

- **BGM**: `bgm` 타입(`classic` / `whitenoise` / `none`) + `audioEnabled` 토글로 제어. **걱정타임 화면·필사 화면**에서 루프 재생, 화면 이탈/타이머 종료 시 세션 종료. 세션당 트랙 1개 랜덤 고정.
- **개구리 음원**: BGM과 별도 인스턴스(expo-av 동시 재생) — [4.8](#48-nfc-진입--개구리-음원) 참조.

---

## 5. 데이터 모델 (AsyncStorage)

서버 없는 **로컬 전용** 저장. 키 정의: `src/storage/keys.ts`, 타입: `src/storage/types.ts`.

| 키 | 내용 | 보존/상한 |
|---|---|---|
| `schemaVersion` | 스키마 버전 (마이그레이션용) | 영구 |
| `user:profile` | 닉네임, 걱정타임, 집중시간, BGM, 토글, pending 변경값 | 영구 (단일) |
| `timer:state` | 사이클 상태(잠금/시작시각/알림 ID 등) | 영구 (단일) |
| `memo:current` | 현재 사이클 메모 배열 | **휘발** — 사이클 종료 시 삭제, **최대 100개/사이클** |
| `record:YYYY-MM-DD` | 하루 기록(꽃/새싹/빈자리) | **영구 저장, 꽃밭은 최근 12개월만 표시** |
| `progress:completedCount` | 완료 누적 카운터 (0~7) | 영구 (단일) |
| `copywrite:seenIds` | 본 필사 콘텐츠 ID | 영구, 한 바퀴 후 리셋 |
| `worry:completeCount` | 걱정타임 누적 완료 수 (점검 시트 트리거) | 영구 (단일) |
| `flower:cycle:used` | 이번 7개 사이클에서 사용한 꽃 type | 7개 채우면 리셋 |

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
