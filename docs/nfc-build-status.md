# NFC 통합 + 빌드 환경 현황

> 최종 업데이트: 2026-05-28
> 상세 plan: `C:\Users\SAMSUNG\.claude\plans\ancient-tumbling-noodle.md`

## 📍 Git 브랜치 상태

| 브랜치 | 내용 |
|--------|------|
| `main` | figma 작업까지 (GitHub push 완료, `0d5671b`) — **NFC 코드 없음** |
| `nfc-test` (로컬 only) | NFC 통합 전체 코드. 2 commit (`8b0f158` 설치, `e951fe3` 코드) |

- 현재 작업 위치: **nfc-test** (또는 확인: `git branch --show-current`)
- main 으로 가려면: `git checkout main` (android/ 폴더는 .gitignore 라 무시됨)

## 🏗 빌드 환경

- **현재**: Expo Go (핫리로드). nfc-test 에서 `npx expo prebuild --platform android` 이미 실행됨 → `android/` 폴더 로컬 존재 (gitignore)
- **Android SDK 미설치** — `npx expo run:android` 로컬 빌드 불가 상태
  - 환경: Java 21 ✅, Node v24 ✅, adb/ANDROID_HOME ❌
- **실제 빌드 옵션 (미결정)**:
  - A) Android Studio 설치 → `npx expo run:android`
  - B) EAS Build (클라우드, Android Studio 불필요): `npm i -g eas-cli` → `eas build -p android --profile development`

### 핫리로드 vs 리빌드
- **JS/스타일/애니메이션/마진/음원파일** → 핫리로드 (리빌드 X), Expo Go 와 동일
- **native 라이브러리 추가 / 권한·manifest 변경** → 리빌드 필요
- git push = 버전 관리/공유일 뿐, 앱 자동 업데이트 아님

## ✅ NFC 코드 — 작성 완료 (nfc-test 브랜치)

| 파일 | 내용 |
|------|------|
| `src/audio/frog.ts` (신규) | 3 음원 helper (`playFrogStart/5min/End`) + NFC 세션 플래그 (`setNfcSession`/`isNfcSession`, AsyncStorage key `nfc_session`) |
| `src/components/GlobalToast.tsx` (신규) | module emitter `emitGlobalToast()` + `<GlobalToastHost />` |
| `src/nfc/nfcEntry.ts` (신규) | `handleNfcTagEntry()` — state별 분기 |
| `App.tsx` | NfcManager listener + Linking deep link + GlobalToastHost 마운트 |
| `src/screens/WorryTimeScreen.tsx` | 5분/끝 시점 NFC 세션이면 🐸 음원 |
| `src/timer/timerService.ts` | completeTimer/lockCycle 종료 시 `setNfcSession(false)` |
| `app.json` | `android.permission.NFC` + `package: com.anonymous.Social_Impact` |
| `android/.../AndroidManifest.xml` | NFC permission + deep link intent filter (`worrytime.app/start`) |

### NFC 태그 (피규어)
- NTAG213, 180 bytes, 빈 태그, 쓰기 가능 (lock 안 함)
- 쓸 URL: `https://worrytime.app/start` (NFC Tools 앱으로 수동 쓰기 — 통합 시점에)

### state별 NFC 동작
| State | 동작 | 🐸 |
|-------|------|-----|
| active/inProgress/advanced | WorryTimeEntry | ✅ 시작음 |
| idle (걱정타임 전) | NotWorryTime 시트 재사용 | ❌ |
| delayed | GlobalToast "○○시에 다시" | ❌ |
| locked/completed/idle+지남 | Home + showWorryEnded 모달 | ❌ |

## 🐸 개구리 음원 (NFC 세션 전용)

| 시점 | 멘트 | 파일 |
|------|------|------|
| 시작 | "준비해볼까요?" | `assets/sounds/frog_start.mp3` |
| 5분 남음 | "남은 시간동안 천천히 생각해봐요" | `frog_5min.mp3` |
| 끝 | "끝났어요. 고민을 내려놓아요" | `frog_end.mp3` |

- **NFC 진입 세션에서만** 재생 (일반 진입은 무음) — `isNfcSession()` 체크
- **BGM 과 독립** — `audioEnabled` 토글 영향 안 받음 (BGM 꺼져도 개구리 재생)
- ✅ **음원 수령 완료 (2026-05-29)** — `assets/sounds/frog_{start,5min,end}.mp3` 3개 추가 + `frog.ts` require 주석 해제 완료 (원본 카톡: `1_voice_start`/`2_voice_5min`/`3_voice_end`)
- 분기 변경 쉬움: "항상 재생" → `if (await isNfcSession())` 제거 / 사용자 토글 → profile 필드 추가

## 📋 NFC 남은 작업

1. **빌드 환경 결정** (Android Studio or EAS) → 실제 dev build
2. **NFC 태그에 URL 쓰기** (NFC Tools, 5분)
3. ~~음원 파일 3개 추가~~ ✅ 완료 (2026-05-29)
4. **실기기 11개 시나리오 테스트** (plan 파일 검증 매트릭스 참고)

## ⚠ 테스트 모드 값 (사용자 결정: 그대로 유지)

- `worryTimeWindow.ts` `MIN_DELAY_OFFSET_MIN = 1` (원래 10) — **테스트용 유지, 배포 직전 10으로**
- 4월 더미 seed (`App.tsx`, `__DEV__` only, release 자동 제외)
- 그 외 30분/60분/2번째팝업/5초 등은 모두 production 정상값
