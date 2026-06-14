# /fleet — 함대 (영구 멀티레인 오케스트레이터)

> N 개 독립 레인을 백그라운드로 돌리되, **각 레인은 자기가 착륙하는 즉시 다음 라운드를 스스로 발사**한다 — 레인 간 barrier 없음, 수동 재발사 없음. abg(1회 barrier fan-out)·cycle(단일 self-feed 레인)의 무제한-병렬 형제.

핵심: "fire-on-arrival" 은 메인 루프 행동 — 백그라운드 Agent 가 완료되면 harness 가 너(메인 루프)를 다시 부르고, **그때 착륙한 레인의 다음 라운드를 즉시 발사**한다. (셸 hook 은 agent 를 못 띄우므로 루프는 네 턴에서 산다.)

## 0. 인자 파싱
- `name:goal, name:goal, …` → 그 레인 셋.
- 비어있음 → 직전 턴이 제시한 브랜치에서 레인 추론(abg 처럼), 없으면 roster `.harness/fleet/active` 읽기.
- `go` → 이미 도는 함대 계속(착륙했는데 미발사 레인 재발사).
- `stop` → 재발사 중단, 진행 중 레인은 drain, roster 삭제, 최종 요약.

## 1. 함대 개시 (첫 턴)
1. roster 기록: `.harness/fleet/active`, 한 줄당 레인명.
2. 각 레인의 현재 라운드를 background `Agent` 로 발사 — `run_in_background:true`, 코드 편집 레인은 `isolation:"worktree"`(레인별 비중첩 → index 충돌 방지), 프롬프트 자기완결(라운드 목표 + verify 기준 + "결과 보고 + 다음 라운드 명명 + depletion 테스트").
3. 🌐 함대 report(§3) 출력.

## 2. fire-on-arrival (완료 알림마다)
레인 Agent 완료 시 같은 턴에:
1. **통합** — 그 레인 결과 commit/기록(명시 경로 · 비밀스캔 · 해당 문서).
2. **다음 라운드 도출** — agent 보고에서 명명한 라운드.
3. **즉시 발사** — 그 레인 다음 라운드를 background Agent 1개로. 멈춰 묻지 말 것·다른 레인 기다리지 말 것. (예외: 비용 발생 레인(pod/GPU rent 등)=4축 박스로 surface 후 명시 `go` 대기, 자동 rent 금지. 예외: 파괴적/되돌릴수없는/외부노출 단계=확인 후 재개.)
4. **depletion 체크** — 목표 달성 OR closed-negative/벽(🧱) OR 정직한 다음 라운드 없음 → 그 레인 🏁/🧱 표시(필러 라운드 만들지 말 것). 다른 레인은 무관.
5. **🌐 함대 report(§3) — 이 턴 필수.**

모든 레인 🏁/🧱 → `.harness/fleet/active` 삭제 + 최종 요약.

## 3. 🌐 함대 report — 필수 형태 (함대 live 인 매 턴)
```
🌐 함대 — <N> lane (<live>/<N> in-flight)
├─ <icon> <lane>  : r<k> <round-goal> <status>
└─ <icon> <lane>  : ...

방금 착륙: <lane> r<k> — <verdict 1줄: PASS/FAIL · 핵심수치> → r<k+1>(<next>) 🔁 발사됨
대기:     <in-flight lane 목록>
depletion: <🏁/🧱 lane + 이유>  (없으면 생략)
```
status 토큰 — `⏳`in-flight · `✅→🔁`착륙+재발사 · `🏁`depleted(목표) · `🧱`벽(closed-negative) · `💰`비용대기(go 대기).

## 4. Halts (전 레인)
- 비용 레인 → 4축 박스 + 명시 `go`(자동 rent 금지).
- 파괴적/되돌릴수없는/외부노출(public push·삭제·대량쓰기) → bypass halt: 확인 후 재개.
- Agent 가 rate-limit/socket 에러로 죽음(0/부분 토큰) → checkpoint 브랜치/worktree 남김 → 거기서 재발사(지수 backoff), 처음부터 재시작 금지.

## 5. 동시성
고정 레인 cap 없음 — 머신 부하 정직하게. 코드 편집 레인은 worktree 격리해 git index 충돌 방지.
