@V := "tape" :: spec [active]
  version = "1.9"

@D r1 := "recommend on 4 parallel axes — 4 champions, never 1 weighted winner" :: rule [required active]
  do   = "whenever you make ANY recommendation to the user, present FOUR champion options — one per axis: ① 완성도(complete) ② 단순(simple) ③ 안전(safe) ④ 표준(std) — each with a one-line rationale"
  do   = "① 완성도(complete) = the most robust option — handles edge-cases · fewest unhandled failure modes · highest coverage"
  do   = "② 단순(simple) = the Occam option — fewest moving parts · least new surface · easiest to hold in one head"
  do   = "③ 안전(safe) = the minimal-blast-radius option — smallest irreversible footprint · easiest to roll back · least collateral"
  do   = "④ 표준(std) = the convention-fit option — matches the established pattern in this repo/domain · least surprise to a future reader"
  dont = "collapse the four axes into ONE weighted-sum winner — surface all four so the user picks the axis THEY weight highest"
  dont = "skip an axis · merge two axes · silently drop the box when the recommendation is 'obvious' (the user still sees the trade-offs)"

@D r2 := "fixed output box — render this shape verbatim for every recommendation" :: format [required active]
  do   = "render the recommendation as this ASCII box (one champion line per axis, rationale after the em-dash):"
  do   = "┌─ 추천 (4축) ─────────────────────────────"
  do   = "│ ① 완성도 : <안> — <한 줄 근거>"
  do   = "│ ② 단순   : <안> — <한 줄 근거>"
  do   = "│ ③ 안전   : <안> — <한 줄 근거>"
  do   = "│ ④ 표준   : <안> — <한 줄 근거>"
  do   = "└──────────────────────────────────────────"
  do   = "if a default axis is set (r4), ★-prefix that axis line IN PLACE (numbering ①②③④ order unchanged) and append `  ← 기본값` — the other three lines stay unmarked"
  dont = "prose-only recommendations · tables · prose paragraphs in place of the box (commons g3 — minimal · ASCII)"

@D r3 := "converge → collapse to one 전축 합의 line" :: rule [required active]
  do   = "when all four axes pick the SAME option, drop the 4-line box and render ONE line: `전축 합의: <안> — <한 줄 근거>`"
  dont = "render four identical champion lines when the axes converge — collapse to the single 전축 합의 line instead"

@D r4 := "default mode — present · auto · fixed-axis (optional standing pick)" :: rule [required active]
  do   = "an optional default MODE MAY be set in `$HOME/.sidecar/recommend-default` (one token: present · auto · complete · simple · safe · std · absent=present) — the inject hook surfaces the active mode as a `# default mode:` directive"
  do   = "PRESENT (absent file = this) = the original behavior — render the r2 four-axis box, the user picks each time; NO auto-decision, NO ★"
  do   = "AUTO = 4축 합의기준 자동 — score the candidate options on ALL four axes (완성도·단순·안전·표준, 1–5, weighted avg default 1:1:1:1, tie→안전 wins), auto-pick the consensus winner, and render the r2 box THEN one conclusion line `🤖 4축 auto-pick: <안> (완성도=X 단순=Y 안전=Z 표준=W · weighted=<sum>)` — decide for the user instead of waiting (the box above keeps the trade-offs visible)"
  do   = "FIXED-AXIS (complete · simple · safe · std) = 임의(고정) 선택 · auto-proceed — ★-mark that axis line IN PLACE in the r2 box (numbering ①②③④ order unchanged) + append `  ← 기본값`, STILL render all four lines, THEN AUTO-PROCEED with that axis's champion as the decision (decide for the user, do NOT wait — like AUTO, but the winning axis is PRE-FIXED, not scored) + one conclusion line `🤖 고정축 auto-pick: <안> (<axis> 기준)`"
  do   = "set via `_recommend.hexa set-default <present|auto|complete|simple|safe|std>` · clear via `clear-default` (→ present) · read via `get-default`"
  dont = "drop the other three axes (AUTO + FIXED both keep the box) · treat any mode as an s11 opt-out of the box · collapse to one line unless the axes genuinely converge (that is r3) — AUTO + FIXED-AXIS conclusion lines are IN ADDITION to the box, not instead of it · render FIXED-AXIS as ★-only then WAIT (FIXED-AXIS MUST auto-proceed — that is the whole point of fixing an axis)"
