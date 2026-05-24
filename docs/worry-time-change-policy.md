# 🌸 걱정타임 시간 변경 정책 (단순화 최종안)

> **상태**: 구현 완료 (2026-05-24)
> **관련 코드**: `src/timer/timerService.ts`, `src/storage/storage.ts`, `src/screens/SettingsScreen.tsx`
> **이전 안 (사이클당 1회, Option A 등) 폐기** — 사용자 통찰로 단순화됨

---

## 🎯 최종 룰 (한 줄)

```
시간 변경 = 다음 사이클부터 적용 (오늘 알람/타이머는 영향 없음)
- 걱정타임 시작 시각 (worryTime)
- 집중 시간 (focusMinutes)
- 둘 다 동일 룰
```

→ 무한 미루기 구조적 차단
→ 횟수 제한 불필요 (몇 번 바꿔도 마지막 값만 유효)
→ 미루기는 별도 사이클당 1회 (기존 룰 유지)

---

## 📌 구현 방식

### 핵심: pending 슬롯

```typescript
UserProfile {
  worryTime: { hour, minute };           // 현재 cycle에 적용 중
  focusMinutes: number;                  // 현재 cycle에 적용 중
  pendingWorryTime?: { hour, minute };   // 다음 cycle부터 적용 예정
  pendingFocusMinutes?: number;          // 다음 cycle부터 적용 예정
}
```

### 변경 흐름

1. 사용자 설정 변경 → `pendingWorryTime` / `pendingFocusMinutes`에 저장 (active는 안 건드림)
2. 오늘 cycle은 OLD 값 그대로 사용
3. 오늘 cycle 끝 (`completeTimer` / `lockCycle`) → `applyPendingProfile()` → pending을 active로 promote
4. 다음 cycle 알람은 NEW 값으로 schedule

### 예외: locked/completed 상태에서 변경

오늘 cycle이 이미 끝났고, 다음 cycle 알람이 이미 OLD 값으로 예약된 상태:
→ 즉시 `applyPendingProfile()` + 알람 cancel/reschedule
→ 사용자 입장: 변경하자마자 "다음 알람은 새 값" — 자연스러움

---

## 📋 케이스별 동작

| 상황 | 동작 |
|------|------|
| idle (오늘 cycle 시작 전) + 변경 | pending 저장. 오늘 알람 OLD 그대로. 내일부터 NEW. |
| locked / completed + 변경 | 즉시 적용 + 다음 알람 reschedule. 내일부터 NEW. |
| inProgress / active / delayed / advanced + 변경 | 🚫 차단 (Alert) |
| 같은 사이클 안에서 여러 번 변경 | 마지막 값만 유효 (pending이 덮어쓰기) |

---

## 🛡️ 미루기 (별도 룰, 기존 유지)

| 항목 | 룰 |
|-----|-----|
| 횟수 | 사이클당 1회 (`isDelayed` 플래그) |
| 시간 상한 | 다음 새벽 04:00 까지 |
| worryTime이 04:00인 경우 | 미루기 불가 |

→ 시간 변경과 미루기는 완전 독립.

---

## 🎨 안내 메시지

| 상황 | 메시지 |
|------|------|
| 변경 후 pending이 존재 (idle 상태) | "변경한 시간은 다음 사이클부터 적용돼요." |
| 진행 중 변경 시도 | "걱정 타임이 진행 중이라 변경할 수 없어요." |

(절대 시각 표시는 다음 작업으로 — 예: "5월 25일 (화) 16:00부터 적용돼요")

---

## 📂 구현 파일

| 파일 | 변경 |
|-----|-----|
| `src/storage/types.ts` | `UserProfile`에 `pendingWorryTime`, `pendingFocusMinutes` 추가 |
| `src/storage/storage.ts` | `applyPendingProfile()` 헬퍼 추가 |
| `src/timer/timerService.ts` | `completeTimer`, `lockCycle`에서 `applyPendingProfile` 호출 |
| `src/screens/SettingsScreen.tsx` | 핸들러를 pending 저장으로 변경 + 표시값 pending 우선 + hint 추가 |

---

## 🔮 미구현 (디자이너 확인 후)

- **절대 시각 표시**: "5월 25일 (화) 16:00부터" 토스트/배너
- **시간 변경 UI에서 결과 미리보기**: TimePicker 안에서 "다음 알람: ○○일 ○○시"
- **사용자에게 사이클 개념 노출 여부** — 디자이너는 "노출 X" 의견. 현재 hint도 "다음 사이클"이라 표현 — "내일부터"로 바꿀지 검토

---

## 📌 핵심 원칙

### 1. "오늘"의 정의
- **내부 로직**: 새벽 04:00 ~ 다음 04:00 (1 사이클)
- **사용자 노출**: ❌ 노출 X — UI는 "오늘/내일"로 자연스럽게
- 새벽 시간대 설정 사용자에게도 "잠들고 깨면 새 사이클" 직관 유지

### 2. "사이클당 1회 미루는 행동" — Option A (각각 1회)
| 행동 | 카운트 | 비고 |
|-----|------|-----|
| 미루기 (1차 알람 후) | 사이클당 1회 | `isDelayed` 플래그 |
| 시간 변경 늦추기 | 사이클당 1회 | `isTimeDelayed` 플래그 (신규) |

→ 사이클당 최대 **늦춤 2번** (시간 변경 1회 + 미루기 1회)
→ 무한 미루기 차단 + 정당한 사용 허용

---

## 📋 시간 변경 결정 트리

```
사용자가 시간을 T_old → T_new로 변경

┌─ 진행 중 / 앞당기기 작성 중?
│   └─ YES → 🚫 변경 차단
│
├─ T_new == T_old?
│   └─ YES → 변경 없음 (no-op)
│
├─ T_new < T_old (당기기)
│   └─ T_new가 오늘(사이클) 미래?
│       ├─ YES → ✅ 오늘 T_new (즉시 알람 재예약)
│       └─ NO  → 🟡 내일 T_new (오늘은 T_old 그대로)
│
└─ T_new > T_old (늦추기)
    ├─ isDelayed=true 또는 isTimeDelayed=true?
    │   └─ YES → 🟡 내일 T_new (오늘은 그대로)
    └─ T_new가 오늘(사이클) 미래?
        ├─ YES → ✅ 오늘 T_new + isTimeDelayed=true
        └─ NO  → 🟡 내일 T_new (이미 지남)
```

---

## 📊 케이스별 결과

### ① 당기기 + 오늘 미래

> 예) 18시 → 17시 (now=16시)

```
04:00 ── [16시 지금] ── 17시 ── 18시 ── 04:00
                       [T_new] [T_old]
                          ↑
                  ✅ 오늘 17시 적용
```

**→ 즉시 알람 재예약, 오늘 17시 알람**

### ② 당기기 + 이미 지난 시각

> 예) 18시 → 12시 (now=16시)

```
04:00 ── 12시 ── [16시 지금] ── 18시 ── 04:00 ── 12시
        [T_new]                [T_old]         [내일]
        이미 지남                                   ↑
                                          ✅ 내일 12시
```

**→ 오늘은 18시 그대로 + 내일 12시부터**

💬 안내: *"오늘 12시는 이미 지났어요. 내일부터 12시에 알림이 와요. 오늘은 원래 시간(18시)에 알림이 와요."*

### ③ 늦추기 + 오늘 미래 (1번째)

> 예) 14시 → 15시 (now=13시, isDelayed=false, isTimeDelayed=false)

```
04:00 ── [13시 지금] ── 14시 ── 15시 ── 04:00
                       [T_old] [T_new]
                                  ↑
                          ✅ 오늘 15시 적용
                          + isTimeDelayed=true
```

**→ 오늘 15시 알람 (시간 변경 늦추기 1회 소진)**
**→ 이후 15시 알람 받고 미루기는 여전히 가능 (1회 권리 별도)**

### ④ 늦추기 + 이미 1회 사용

> 예) 시간 변경 늦추기 후 또 늦추려고 함 (isTimeDelayed=true)

**→ 내일 T_new부터, 오늘은 현재 알람 그대로**

💬 안내: *"오늘 미루기 기회를 이미 사용했어요. 내일부터 새 시간이 적용돼요."*

### ⑤ 늦추기 + 이미 지난 시각

> 예) 14시 → 13시인데 지금 13:30 (T_old 전, T_new 지남)
> → 사실 13<14이라 당기기 케이스. 늦추기인데 이미 지남은 불가능한 조합.

### ⑥ 걱정타임 진행 중

```
04:00 ── 14시 ── [지금] ── 15:30 ── 04:00
        [시작]              [잠금]
                  ↑
            🚫 차단
```

💬 안내: *"걱정타임 중에는 시간을 바꿀 수 없어요"*

### ⑦ 미루기 중 (isDelayed=true)

> 예) 14시 알람 받고 16시로 미루기 함 → 시간 변경 시도

**→ 다음 사이클부터 (오늘은 미루기 시각 그대로)**
**→ 시간 변경 늦추기와 미루기는 카운트 별개지만, 미루기 사용 후엔 cycle 진행 중이라 사실상 변경 의미 없음**

### ⑧ 완료 후 (오늘 사이클은 빈 상태)

> 예) 새벽 1시 완료 (어제 사이클로 침) → 정오에 16시로 변경

```
어제 04:00 ── 01:00 ── 04:00 ── [12시 지금] ── 16시 ── 04:00
              [완료🌸]    ↑                    [T_new]
              어제 사이클  오늘 사이클 시작        ↑
                        (빈 상태)         ✅ 오늘 16시 가능
```

**→ 오늘 사이클은 아직 행동 X (isDelayed=false, isTimeDelayed=false)**
**→ 케이스 ① 또는 ③ 룰 적용**

### ⑨ 빈자리 후

> 예) 14시 사이클 놓침(빈자리). 18시에 와서 20시로 변경.

**→ 다음 사이클부터 (오늘 사이클은 이미 잠김)**

---

## ✅ 한눈에 정리표

| # | 상황 | 결과 |
|---|-----|------|
| ① | 당기기 + 오늘 미래 | 🟢 오늘 T_new |
| ② | 당기기 + 이미 지남 | 🟡 내일 T_new |
| ③ | 늦추기 + 오늘 미래 + 1회 미사용 | 🟢 오늘 T_new (+ 카운트 소진) |
| ④ | 늦추기 + 1회 사용 후 | 🟡 내일 T_new |
| ⑥ | 걱정타임 진행 중 | 🔴 차단 |
| ⑦ | 미루기 중 | 🟡 내일 T_new |
| ⑧ | 완료/빈자리 후 | 케이스 ①~④ 룰 적용 |

---

## 🛡️ 미루기 vs 시간 변경 늦추기 카운트

```
사이클당:
  - isDelayed:       false / true  (미루기 사용 여부)
  - isTimeDelayed:   false / true  (시간 변경 늦추기 사용 여부)

→ 최대 시나리오:
  13시: 시간 변경으로 14→15 (isTimeDelayed=true)
  15시: 알람 받음
  15:30: 미루기로 17시 (isDelayed=true)
  17시: 걱정타임
  → 사이클당 늦춤 총 2번

→ 무한 루프 차단:
  13시: 시간 변경 14→15 (isTimeDelayed=true)
  14:30: 시간 변경 또 15→16 시도 → ❌ 차단 (내일부터)
```

리셋 시점:
- `completeTimer` → 둘 다 false
- `lockCycle` → 둘 다 false
- 새 사이클 시작 시 자연스럽게 리셋

---

## 🎨 안내 메시지 (디자인 필요)

| 케이스 | 메시지 |
|-------|--------|
| ② 당기기 이미 지남 | "오늘 ○시는 이미 지났어요. 내일부터 ○시에 알림이 와요." |
| ③ 늦추기 1회 사용 | (별도 메시지 없음 — 자연스럽게 새 시각 알람) |
| ④ 늦추기 카운트 소진 | "오늘 미루기 기회를 이미 사용했어요. 내일부터 새 시간이 적용돼요." |
| ⑥ 걱정타임 중 | "걱정타임 중에는 시간을 바꿀 수 없어요" |
| ⑦ 미루기 중 | "오늘은 미루기한 시간 그대로예요. 내일부터 새 시간이 적용돼요." |
| ⑨ 빈자리 후 | "오늘 걱정타임은 지나갔어요. 내일부터 적용돼요." |

→ 디자이너 톤앤매너 정리 필요

---

## 🛠 구현 시 참고 (개발자 메모)

### 신규 상태 필드

`src/storage/types.ts` `TimerState`에 추가:
```ts
isTimeDelayed: boolean; // 사이클당 시간 변경 늦추기 1회 카운트
```

### 시간 변경 함수 (신규)

`src/timer/timerService.ts`에 추가:
```ts
export async function changeWorryTime(
  newWorryTime: WorryTime,
  worryTime: WorryTime  // current (for T_old)
): Promise<{ applied: 'today' | 'tomorrow'; reason?: string }>
```

### 결정 로직

`src/timer/worryTimeWindow.ts`에 추가:
```ts
export function decideTimeChangeApplication(params: {
  oldTime: WorryTime;
  newTime: WorryTime;
  now: Date;
  isDelayed: boolean;
  isTimeDelayed: boolean;
  isLocked: boolean;
  isAdvanced: boolean;
}): {
  apply: 'today' | 'tomorrow' | 'blocked';
  consumeTimeDelayCount: boolean;
  reason?: string; // for UI message
}
```

### 알림 재예약

- `apply: 'today'` → 기존 알람 취소 + 새 시각으로 즉시 `scheduleCycle` 재호출
- `apply: 'tomorrow'` → `worryTime` 저장만, 다음 사이클의 `lockCycle → scheduleCycle`이 자동 적용

### 관련 파일

- `src/timer/timerService.ts` — `changeWorryTime` (신규), `completeTimer`, `lockCycle`
- `src/timer/worryTimeWindow.ts` — `decideTimeChangeApplication` (신규)
- `src/timer/stateMachine.ts` — `getCycleDayBoundaryTs` (04:00 경계)
- `src/notifications/scheduler.ts` — `scheduleCycle`, `cancelCycleNotifications`
- `src/storage/storage.ts` — `getUserProfile`, `saveUserProfile`
- `src/storage/types.ts` — `TimerState`에 `isTimeDelayed` 추가
- `src/screens/SettingsScreen.tsx` 또는 시간 변경 UI — `changeWorryTime` 호출 + 결과 안내

---

## 📌 정해진 사항 요약

1. ✅ "오늘" = 새벽 04:00 ~ 다음 04:00 (내부 로직), UI는 "오늘/내일"로 자연스럽게
2. ✅ 미루기 + 시간 변경 늦추기 = 각각 사이클당 1회 (Option A)
3. ✅ 당기기는 오늘 가능 (T_new가 미래일 때) + 카운트 소진 X
4. ✅ 이미 지난 시각으로 변경 → 다음 사이클부터
5. ✅ 완료 후 변경: 오늘 사이클이 빈 상태면 케이스 ①~④ 룰 적용

## 🔮 미정 (디자이너와 추가 협의)

- 안내 메시지 톤앤매너
- 시간 변경 UI에서 "오늘부터 / 내일부터" 결과 미리보기 표시 여부
- 시간 변경 늦추기 카운트를 사용자에게 노출할지 (예: "오늘 미루기 기회 남음: 1/1")
