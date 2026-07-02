#!/usr/bin/env bash
# stale-main-edit guard smoke — GIT-EDIT-STALE-MAIN (pre write).
# Reproduces the stale-base duplicate-work trap: clone A sits on main, clone B
# pushes an upstream change to the same file, A never fetches. The guard must
# TTL-fetch origin, detect main is behind, and DENY editing the upstream-touched
# file (warn-only for untouched files; silent after ff-sync; linked worktrees
# and the off-main guard unaffected). Run from anywhere: state dir is self-cleaned.
set -u
SIDECAR="${SIDECAR:-$(cd "$(dirname "$0")/../.." && pwd)/bin/sidecar}"
S="$(mktemp -d)/staleq"
mkdir -p "$S"
pass=0; fail=0
ok() { echo "PASS: $1"; pass=$((pass + 1)); }
ng() { echo "FAIL: $1"; fail=$((fail + 1)); }

git -c init.defaultBranch=main init --bare -q "$S/origin.git"
git clone -q "$S/origin.git" "$S/A" 2>/dev/null
git -C "$S/A" checkout -q -b main 2>/dev/null || true
printf 'one\n' >"$S/A/f.txt"; printf 'two\n' >"$S/A/g.txt"
git -C "$S/A" add .; git -C "$S/A" -c user.email=t@t -c user.name=t commit -qm base
git -C "$S/A" push -q origin main
git clone -q "$S/origin.git" "$S/B"
printf 'one-upstream\n' >"$S/B/f.txt"
git -C "$S/B" add .; git -C "$S/B" -c user.email=t@t -c user.name=t commit -qm up
git -C "$S/B" push -q origin main

payload() { printf '{"tool_name":"Edit","tool_input":{"file_path":"%s","old_string":"o","new_string":"n"}}' "$1"; }

# 1) upstream-touched file on stale main -> DENY
OUT=$(payload "$S/A/f.txt" | "$SIDECAR" pre write 2>&1)
echo "$OUT" | grep -q 'GIT-EDIT-STALE-MAIN' && ok "deny on upstream-touched file" || ng "no deny: $OUT"
# 2) untouched file -> warn only
OUT=$(payload "$S/A/g.txt" | "$SIDECAR" pre write 2>&1)
echo "$OUT" | grep -q 'permissionDecision":"deny' && ng "untouched file denied" || ok "untouched file passes"
echo "$OUT" | grep -q 'GIT-STALE-MAIN' && ok "warn emitted for behind main" || ng "no warn: $OUT"
# 3) TTL stamp respected (no refetch within TTL)
M1=$(stat -f %m "$S/A/.git/sidecar-fetch-stamp" 2>/dev/null || stat -c %Y "$S/A/.git/sidecar-fetch-stamp")
sleep 1; payload "$S/A/f.txt" | "$SIDECAR" pre write >/dev/null 2>&1
M2=$(stat -f %m "$S/A/.git/sidecar-fetch-stamp" 2>/dev/null || stat -c %Y "$S/A/.git/sidecar-fetch-stamp")
[ "$M1" = "$M2" ] && ok "TTL stamp respected" || ng "refetched within TTL"
# 4) after ff-sync -> silent
git -C "$S/A" merge --ff-only -q origin/main
OUT=$(payload "$S/A/f.txt" | "$SIDECAR" pre write 2>&1)
echo "$OUT" | grep -q 'GIT-EDIT-STALE-MAIN\|GIT-STALE-MAIN' && ng "fired after sync: $OUT" || ok "silent after ff-sync"
# 5) linked worktree exempt
git -C "$S/A" worktree add -q "$S/A-wt" -b feat/x origin/main
printf 'one-upstream2\n' >"$S/B/f.txt"; git -C "$S/B" add .
git -C "$S/B" -c user.email=t@t -c user.name=t commit -qm up2; git -C "$S/B" push -q origin main
rm -f "$S/A/.git/sidecar-fetch-stamp"
OUT=$(payload "$S/A-wt/f.txt" | "$SIDECAR" pre write 2>&1)
echo "$OUT" | grep -q 'GIT-EDIT-STALE-MAIN\|GIT-EDIT-OFF-MAIN' && ng "blocked in linked wt" || ok "linked worktree exempt"
# 6) off-main guard regression
git -C "$S/A" checkout -q -b old-feature
OUT=$(payload "$S/A/f.txt" | "$SIDECAR" pre write 2>&1)
echo "$OUT" | grep -q 'GIT-EDIT-OFF-MAIN' && ok "off-main guard intact" || ng "off-main regressed: $OUT"

rm -rf "$(dirname "$S")"
echo "== tally: $pass PASS / $fail FAIL"
[ "$fail" -eq 0 ]
