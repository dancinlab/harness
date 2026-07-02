#!/usr/bin/env bash
# pr-cycle-hook smoke — the `gh pr create` full-cycle rewriter (pre bash).
# Port-parity checks against archive_sidecar _pr_cycle.hexa: rewrite (merge tail
# + MARK), linked-worktree cleanup tail, base-override, cross-repo routing,
# quote/draft/merge/MARK skips, and the mass-deletion deny gate.
set -u
SIDECAR="${SIDECAR:-$(cd "$(dirname "$0")/../.." && pwd)/bin/sidecar}"
S="$(mktemp -d)/prq"
mkdir -p "$S"
pass=0; fail=0
ok() { echo "PASS: $1"; pass=$((pass + 1)); }
ng() { echo "FAIL: $1"; fail=$((fail + 1)); }

git -c init.defaultBranch=main init --bare -q "$S/origin.git"
git clone -q "$S/origin.git" "$S/A" 2>/dev/null
git -C "$S/A" checkout -q -b main 2>/dev/null || true
i=0; while [ $i -lt 60 ]; do printf 'x\n' >"$S/A/f$i.txt"; i=$((i + 1)); done
git -C "$S/A" add .; git -C "$S/A" -c user.email=t@t -c user.name=t commit -qm base
git -C "$S/A" push -q origin main
git -C "$S/A" worktree add -q "$S/A-wt" -b feat/x origin/main

run() { # $1=cwd $2=command → hook stdout
  printf '{"tool_name":"Bash","tool_input":{"command":%s}}' "$(printf '%s' "$2" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')" \
    | (cd "$1" && PWD="$1" "$SIDECAR" pre bash 2>/dev/null)
}

# 1) bare create in a LINKED worktree -> rewrite: merge tail + cleanup + MARK
OUT=$(run "$S/A-wt" 'git push -u origin feat/x && gh pr create --title t --body b')
echo "$OUT" | grep -q 'updatedInput' && echo "$OUT" | grep -q 'gh pr merge' && echo "$OUT" | grep -q '__SIDECAR_PR_CYCLE__' && ok "rewrite emitted (merge tail + MARK)" || ng "no rewrite: $OUT"
echo "$OUT" | grep -q 'git worktree remove' && ok "linked-wt cleanup tail" || ng "no cleanup tail: $OUT"
echo "$OUT" | grep -q '"permissionDecision":"allow"' && ok "allow accompanies updatedInput" || ng "missing allow: $OUT"
# 2) create in the MAIN worktree -> rewrite WITHOUT cleanup tail
OUT=$(run "$S/A" 'gh pr create --title t')
echo "$OUT" | grep -q 'gh pr merge' && ! echo "$OUT" | grep -q 'git worktree remove' && ok "main-wt rewrite has no cleanup" || ng "main-wt tail wrong: $OUT"
# 3) --draft -> untouched
OUT=$(run "$S/A-wt" 'gh pr create --draft --title t')
echo "$OUT" | grep -q 'updatedInput' && ng "draft rewritten" || ok "draft skipped"
# 4) explicit merge already present -> untouched
OUT=$(run "$S/A-wt" 'gh pr create --title t && gh pr merge 1 --squash')
echo "$OUT" | grep -q 'updatedInput' && ng "explicit-merge rewritten" || ok "explicit merge skipped"
# 5) trigger only inside quotes -> untouched
OUT=$(run "$S/A-wt" "echo 'gh pr create is a command'")
echo "$OUT" | grep -q 'updatedInput' && ng "quoted payload rewritten" || ok "quoted trigger ignored"
# 6) MARK already present -> untouched (idempotent)
OUT=$(run "$S/A-wt" 'gh pr create --title t  # __SIDECAR_PR_CYCLE__')
echo "$OUT" | grep -q 'updatedInput' && ng "re-rewritten" || ok "idempotent on MARK"
# 7) stacked --base -> overridden to default branch
OUT=$(run "$S/A-wt" 'gh pr create --base feat/parent --title t')
echo "$OUT" | grep -q '\-\-base main' && ok "base-override to main" || ng "base not overridden: $OUT"
# 8) cross-repo --repo -> merge routed to that repo, no local cleanup
OUT=$(run "$S/A-wt" 'gh pr create --repo other/repo --title t')
echo "$OUT" | grep -q 'gh pr merge' && echo "$OUT" | grep -q '\-\-repo other/repo' && ! echo "$OUT" | grep -q 'git worktree remove' && ok "cross-repo routing" || ng "cross-repo wrong: $OUT"
# 9) mass deletion (60 D vs 0 A) -> deny, no rewrite
git -C "$S/A-wt" rm -q -- 'f*.txt'
git -C "$S/A-wt" -c user.email=t@t -c user.name=t commit -qm wipe
OUT=$(run "$S/A-wt" 'gh pr create --title wipe')
echo "$OUT" | grep -q '"permissionDecision":"deny"' && echo "$OUT" | grep -q 'PR-CYCLE-MASS-DELETION' && ok "mass-deletion deny" || ng "no deny: $OUT"

rm -rf "$(dirname "$S")"
echo "== tally: $pass PASS / $fail FAIL"
[ "$fail" -eq 0 ]
