# recommend-axes — 4-axis recommendation rubric (MUST FOLLOW — hard rule, not a hint · SSOT)

spec v2.0 · `sidecar recommend inject` emits this verbatim each turn.

## r1 — recommend on 4 parallel axes (4 champions, never 1 weighted winner)
- On ANY recommendation, present FOUR champion options — one per axis — each with a one-line rationale:
  - ① 완성도(complete) = most robust — handles edge-cases · fewest failure modes · highest coverage.
  - ② 단순(simple) = Occam — fewest moving parts · least new surface · easiest to hold in one head.
  - ③ 안전(safe) = minimal blast radius — smallest irreversible footprint · easiest to roll back · least collateral.
  - ④ 표준(std) = convention-fit — matches the established repo/domain pattern · least surprise to a future reader.
- ✗ Never collapse the four into ONE weighted-sum winner, skip/merge an axis, or drop the box when the pick seems "obvious" — surface all four so the user picks the axis THEY weight highest.
- ⚡ EXEMPT — direct-execute commands are NOT recommendations: when the user NAMES a deterministic command (`pr-cycle`/"머지해줘" · `ci` · `lint` · `ship` · `ci-track` · `self-update` · `pr-cycle --no-doc` …), RUN it immediately — NO box, NO "진행할까요?". The box is for genuine decisions (which approach/what to build) — a branch/strategy choice INSIDE a command still uses it.

## r2 — fixed output box (render this shape verbatim for every recommendation)

```
┌─ 추천 (4축) ─────────────────────────────
│ ① 완성도 : <안> — <한 줄 근거>
│ ② 단순   : <안> — <한 줄 근거>
│ ③ 안전   : <안> — <한 줄 근거>
│ ④ 표준   : <안> — <한 줄 근거>
└──────────────────────────────────────────
```

- Default axis set (r4)? ★-prefix that axis line IN PLACE (①②③④ order unchanged) + append `  ← 기본값`; the other three stay unmarked.
- ✗ No prose-only / table / paragraph recommendations in place of the box (commons g3 — minimal · ASCII).

## r3 — converge → collapse to one 전축 합의 line
- When all four axes pick the SAME option, drop the box and render ONE line: `전축 합의: <안> — <한 줄 근거>` — never four identical champion lines.

## r4 — default mode (present · auto · fixed-axis · fixed-multi)
- Optional default MODE in `.harness/recommend-default` (per-repo, committed = team-shared, wins) or `~/.sidecar/recommend-default` (host-wide, via `set-default --global`) — one token: present · auto · complete · simple · safe · std, OR a `+`/`,`-joined MULTI-axis combo (e.g. `complete+std`); absent = present. The hook surfaces the active mode as a `# default mode:` directive.
- **PRESENT** (absent file = this) = render the r2 box, user picks each turn; NO auto-decision, NO ★.
- **AUTO** = score candidates on ALL four axes (완성도·단순·안전·표준, 1–5, weighted avg default 1:1:1:1, tie→안전), auto-pick the consensus winner, render the r2 box THEN one line `🤖 4축 auto-pick: <안> (완성도=X 단순=Y 안전=Z 표준=W · weighted=<sum>)` — decide instead of waiting.
- **FIXED-AXIS** (complete · simple · safe · std) = STANDING SELECTION already made → box is informational, NEVER a stop point. ⚡ In the SAME turn AUTO-PROCEED with that axis's champion and CONTINUE into executing it — do NOT end on the box, ask "진행할까요?", or wait to re-pick. ★-mark that axis line IN PLACE (①②③④ unchanged) + `  ← 기본값`, STILL render all four, then one line `🤖 고정축 auto-pick: <안> (<axis> 기준)` then the work.
- **FIXED-MULTI** (`+`/`,`-joined combo, e.g. `complete+std`) = STANDING MULTI-axis selection — same auto-proceed mandate as FIXED-AXIS, but SCORED across ONLY the selected axes (each equal-weight, unselected weight 0, tie→안전 if selected else the first listed). ★-mark EACH selected axis line IN PLACE + `  ← 기본값`, STILL render all four, then one line `🤖 복수고정축 auto-pick: <안> (<axes> 기준 · 선택축만 채점)` then the work.
- set via `sidecar recommend set-default <present|auto|complete|simple|safe|std|combo e.g. complete+std>` · clear via `clear-default` (→ present) · read via `get-default`.
- ✗ Never drop the other three axes (AUTO + FIXED both keep the box), treat any mode as an opt-out of the box, or collapse to one line unless the axes genuinely converge (that is r3). AUTO + FIXED conclusion lines are IN ADDITION to the box, never instead of it.
