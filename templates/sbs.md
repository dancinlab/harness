# /sbs — plan-first 순차 런북 (2-mode · chat-form · plan.md handoff)

> 📍 SSOT: 설계 [ARCHITECTURE.json](../ARCHITECTURE.json). 본 문서는 /sbs 런북.
> sidecar `recommend resolve-mode` 가 결정한 mode 를 따른다. AUTO = 4축 가중평균 자동선택, MANUAL = 라운드별 사용자 채팅 응답. 둘 다 같은 흐름.

## 1. mode 파싱
위 `resolved:` 줄을 권위로 따른다 (mode/axis/weights). `mode:` 한 줄을 그대로 echo 해 모드를 선언. task 가 비면 현재 맥락의 작업으로 가정(가정을 말하되 묻지 않음).

## 2. 채팅 disambiguation (양 모드 공통)
plan 잠그기 전, **먼저 모든 미해결 질문을 전부 열거**한 뒤 라운드당 1개씩 채팅으로 (AskUserQuestion 아님). 각 라운드는 easy 7요소 스캐폴드 + 추천 + `→ A · B · 또는 자유응답`.
- **MANUAL**: 사용자 채팅 응답 대기. 미지값을 절대 지어내지 않음 — 모두 질문.
- **AUTO**: 4축(완성도·단순·안전·표준) 가중평균으로 자동선택, 일시정지 없음. `🤖 auto-pick Q<n>: <option> (complete=X simple=Y safe=Z std=W · weighted=<sum>)` 로그.
- **매 라운드 후 재스캔은 건너뛸 수 없는 하드 게이트** — 새/잔여 모호성 있으면 무조건 한 라운드 더. 모호성>0 인데 합의화면 진입 금지. 종료 조건은 명시적 zero-ambiguity 재스캔뿐.

## 3. 합의 화면 (2번이 모호성 0 반환한 뒤에만)
누적 결정셋을 ASCII 트리로 렌더 + 일시정지(AUTO 의 auto-pick 도 사용자 사전확정 체크포인트):
```
🎯 합의된 결정셋 (N개)
┌─ Q1: <axis>  → ✅ <chosen>
├─ Q2: <axis>  → ✅ <chosen>
└─ Qn: <axis>  → ✅ <chosen>
요약: <한 줄 재진술>
plan 문서: drafts/<slug>-plan.md (생성 예정)
→ 맞으면 `go` · 수정은 `Qn=<다른 선택>`
```
`go` → 4번. `Qn=<X>` → 해당 결정만 갱신 후 재렌더. 새 모호성 → 채팅 라운드 → 재렌더.

## 4. plan.md + 백그라운드 handoff (`go` 시)
- slug 도출(kebab-case ≤6 토큰).
- `drafts/` 보장 + `.gitignore` 에 추가(없으면).
- `drafts/<slug>-plan.md` 작성 (frontmatter: slug · mode · `status: active` · AUTO면 weights · 생성일 · 본문 `## task brief` · `## locked decisions` · `## next-action checklist`(끝에 `[ ] ship …`) · `## completion criteria`).
- `## locked decisions` 는 기계검증 계약 가능: `- @L<n> (<axis>): <option> · assert:<kind> <arg>` (`grep <pat>` 존재 / `!pat` 부재 · `file <path>` 존재).
- 백그라운드 Agent(run_in_background) 발사: plan.md 내용 + ship 지침(명시 경로 · no force-push · CHANGELOG 동시 갱신 · push 후 `sidecar sync`(있으면)) + 완료기준 + "끝나면 보고".
- 사용자에게: `🚀 handoff: agent launched · plan saved to drafts/<slug>-plan.md · 나가셔도 됩니다` 후 턴 종료.

## 5. 인라인 fallback (2번 첫 스캔에서 모호성 0)
합의화면+handoff 생략, 인라인 실행: `📋 plan (N steps)` → `▶ i/N` → `✅`/`⚠`/`❌`. AUTO 직진, MANUAL 단계마다 일시정지.

## 6. Halt (전 모드·전 경로)
단계 실패(단계+verbatim 에러+미실행 tail 보고) 또는 되돌릴 수 없는/파괴적/외부노출 단계 직전(확인 후 재개). handoff agent 도 그런 단계 전 먼저 보고.

## 7. Closure
`🏁 <done>/<N> steps complete`.

## 8. Auto-QA 4축 (ship 직후)
**functional**(새 동작?) · **visible**(노출 경로?) · **conformance**(locked decision ↔ 코드 1:1) · **regression**(기존 표면 미손상). 각 PASS/FAIL/SKIP(SKIP=PASS). regression FAIL → `git revert <SHA>` 자동 + banner. 나머지 FAIL → ship 유지 + plan.md `## qa-deferred` + alert. 결과는 plan.md `## qa-results` 에 기록.

## 9. 인계 dossier (handoff agent · QA 직후)
plan PR≥3 또는 변경 LOC≥500 이면 `drafts/<slug>-plan.md` 에 `## handoff` 섹션 작성(PR 상태 · SSOT 파일 인덱스 · 새 API surface · 새 컴포넌트 트리 · 환경변수 · 다음 우선순위 · 알려진 한계 · 시작 가이드). 아니면 SKIP 한 줄 기록. ⛔ 별도 HANDOFF.md 금지 — `sidecar ing` 또는 plan.md 에만.
