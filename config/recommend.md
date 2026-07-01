# recommend-axes — 4-axis recommendation rubric (MUST FOLLOW — hard rule, not a hint · SSOT)

spec v2.0 · `sidecar recommend inject` emits this verbatim each turn.

## r1 — recommend on 4 parallel axes (4 champions, never 1 weighted winner)
- On ANY recommendation, present FOUR champion options — one per axis — each with a one-line rationale:
  - ① Complete = most robust — handles edge-cases · fewest failure modes · highest coverage.
  - ② Simple = Occam — fewest moving parts · least new surface · easiest to hold in one head.
  - ③ Safe = minimal blast radius — smallest irreversible footprint · easiest to roll back · least collateral.
  - ④ Std = convention-fit — matches the established repo/domain pattern · least surprise to a future reader.
- ✗ Never collapse the four into ONE weighted-sum winner, skip/merge an axis, or drop the box when the pick seems "obvious" — surface all four so the user picks the axis THEY weight highest.
- ⚡ EXEMPT — direct-execute commands are NOT recommendations: when the user NAMES a deterministic command (`pr-cycle`/"merge it" · `ci` · `lint` · `ship` · `ci-track` · `self-update` · `pr-cycle --no-doc` …), RUN it immediately — NO box, NO "proceed?". The box is for genuine decisions (which approach/what to build) — a branch/strategy choice INSIDE a command still uses it.

## r2 — fixed output box (render this shape verbatim for every recommendation)

```
┌─ Recommend (4 axes) ─────────────────────
│ ① Complete : <option> — <one-line reason>
│ ② Simple   : <option> — <one-line reason>
│ ③ Safe     : <option> — <one-line reason>
│ ④ Std      : <option> — <one-line reason>
└──────────────────────────────────────────
```

- Default axis set (r4)? ★-prefix that axis line IN PLACE (①②③④ order unchanged) + append `  ← default`; the other three stay unmarked.
- ✗ No prose-only / table / paragraph recommendations in place of the box (commons g3 — minimal · ASCII).

## r3 — converge → collapse to one all-axes-consensus line
- When all four axes pick the SAME option, drop the box and render ONE line: `All-axes consensus: <option> — <one-line reason>` — never four identical champion lines.

## r4 — default mode (present · auto · fixed-axis · fixed-multi)
- Optional default MODE in `.harness/recommend-default` (per-repo, committed = team-shared, wins) or `~/.sidecar/recommend-default` (host-wide, via `set-default --global`) — one token: present · auto · complete · simple · safe · std, OR a `+`/`,`-joined MULTI-axis combo (e.g. `complete+std`); absent = present. The hook surfaces the active mode as a `# default mode:` directive.
- **PRESENT** (absent file = this) = render the r2 box, user picks each turn; NO auto-decision, NO ★.
- **AUTO** = score candidates on ALL four axes (complete·simple·safe·std, 1–5, weighted avg default 1:1:1:1, tie→safe), auto-pick the consensus winner, render the r2 box THEN one line `🤖 4-axis auto-pick: <option> (complete=X simple=Y safe=Z std=W · weighted=<sum>)` — decide instead of waiting.
- **FIXED-AXIS** (complete · simple · safe · std) = STANDING SELECTION already made → box is informational, NEVER a stop point. ⚡ In the SAME turn AUTO-PROCEED with that axis's champion and CONTINUE into executing it — do NOT end on the box, ask "proceed?", or wait to re-pick. ★-mark that axis line IN PLACE (①②③④ unchanged) + `  ← default`, STILL render all four, then one line `🤖 fixed-axis auto-pick: <option> (by <axis>)` then the work.
- **FIXED-MULTI** (`+`/`,`-joined combo, e.g. `complete+std`) = STANDING MULTI-axis selection — same auto-proceed mandate as FIXED-AXIS, but SCORED across ONLY the selected axes (each equal-weight, unselected weight 0, tie→safe if selected else the first listed). ★-mark EACH selected axis line IN PLACE + `  ← default`, STILL render all four, then one line `🤖 multi-fixed-axis auto-pick: <option> (by <axes> · scoring only the selected axes)` then the work.
- set via `sidecar recommend set-default <present|auto|complete|simple|safe|std|combo e.g. complete+std>` · clear via `clear-default` (→ present) · read via `get-default`.
- ✗ Never drop the other three axes (AUTO + FIXED both keep the box), treat any mode as an opt-out of the box, or collapse to one line unless the axes genuinely converge (that is r3). AUTO + FIXED conclusion lines are IN ADDITION to the box, never instead of it.
