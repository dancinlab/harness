// pr-cycle-hook — PreToolUse(Bash) full-cycle REWRITER for `gh pr create`
// (1:1 port of archive_sidecar hooks/pr-cycle-hook/bin/_pr_cycle.hexa).
//
// PR ship discipline (commons cycle-docs-pr · archive g47 — no unmerged stacks):
// a PR is created → merged → its worktree+branch cleaned in the SAME Bash
// invocation. The agent never has to decide (or ask) whether to merge — the
// hook rewrites the command in-flight via PreToolUse `updatedInput`, so
// create→merge→clean is one atomic chain and the next PR starts from fresh main.
//
// Detection: whitespace-tokenize the QUOTE-STRIPPED command and look for the
// 3-gram `gh pr create` anywhere — catches bare and chained (`git push && gh
// pr create …`) forms while a quoted test payload can never trigger it.
// Skip if: `--draft` present · `gh pr merge` already in the command · the
// idempotence MARK is present (already rewritten).
//
// Rewrite tail (emitted as `updatedInput` ALONGSIDE `permissionDecision:
// "allow"` — without the sibling decision Claude Code IGNORES updatedInput and
// the PR is created but never merged; archive 0.3.5 fix):
//   1) ` && gh pr merge "$(gh pr view … --json number -q .number)" --squash
//      --admin --delete-branch` — PR# captured right after create (robust when
//      the branch is detached / worktree mid-teardown); `--head X` pins the
//      view to THAT branch (archive 0.4.1); `--repo X` routes a cross-repo
//      create's merge to the SAME repo, with NO local worktree cleanup.
//   2) ` && (cd <main-wt> && git worktree remove <this-wt> --force && git
//      branch -D <branch> || true)` — only when cwd is a LINKED worktree.
//   3) BASE-OVERRIDE (archive 0.4.0): a stacked `--base <parent>` is rewritten
//      to the repo default branch so the squash-merge lands on main, never on
//      a parent that itself never reaches it (stacked-PR pile-up).
//
// DELETION-SANITY GATE (stale-base regression guard — anima #1105, 35190 files
// silently revert-deleted): before appending the auto-merge, tally D/A counts
// of the diff this squash would land (merge-base(origin/main,HEAD)...HEAD; a
// cross-repo create probes `gh pr diff --repo X`). D > 50, or D >= 10×A with
// D > 20, is a mass-deletion outlier → the auto-merge is DENIED for human
// inspection (the create itself is withheld with it — rerun by hand if truly
// intended). Probe failure is fail-open ([-1,-1] → no hit): a flaky probe must
// never wedge a legit merge.
//
// No opt-out by design — no env var, no config flag, no exception list
// (faithful to the archive; the only skips are --draft and an explicit merge).
import { execShell } from "../lib/exec.ts";

export const PR_CYCLE_MARK = "__SIDECAR_PR_CYCLE__";
// Absolute deletion ceiling for an auto-merge; above it the PR is an outlier.
const MAX_DELETIONS = 50;
// Asymmetry trip: deletions >= this multiple of additions (over the abs floor)
// is the silent-revert fingerprint even under the ceiling.
const DEL_RATIO = 10;
const DEL_RATIO_FLOOR = 20;

export type PrCycleRewrite =
  | { kind: "deny"; reason: string }
  | { kind: "rewrite"; command: string; note: string };

// Strip single/double-quoted regions (quote chars dropped too) so trigger
// tokens INSIDE quoted args can never fire the detector. Backslash escapes the
// next char inside double quotes; unterminated quotes consume the remainder —
// the safe direction (miss a trigger rather than rewrite a test payload).
export function stripQuoted(s: string): string {
  let out = "";
  let inSq = false;
  let inDq = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inSq) {
      if (c === "'") inSq = false;
    } else if (inDq) {
      if (c === "\\" && i + 1 < s.length) i++;
      else if (c === '"') inDq = false;
    } else {
      if (c === "'") inSq = true;
      else if (c === '"') inDq = true;
      else out += c;
    }
  }
  return out;
}

function hasGhPrCreate(toks: string[]): boolean {
  for (let i = 0; i + 2 < toks.length; i++) {
    if (toks[i] === "gh" && toks[i + 1] === "pr" && toks[i + 2] === "create") return true;
  }
  return false;
}

// Wrap in single quotes; escape embedded singles as '\''.
function shellSq(s: string): string {
  return "'" + s.replace(/'/g, "'\\''") + "'";
}

// `--flag <X>` / `--flag=<X>` value from the quote-stripped tokens ("" = absent).
function flagValue(toks: string[], flag: string): string {
  for (let i = 0; i < toks.length; i++) {
    if (toks[i] === flag && i + 1 < toks.length) return toks[i + 1];
    if (toks[i].startsWith(flag + "=")) return toks[i].slice(flag.length + 1);
  }
  return "";
}

async function git(cmd: string, cwd: string): Promise<string> {
  const r = await execShell(cmd, { cwd: cwd || ".", timeoutMs: 8000 }).catch(() => null);
  return r && r.code === 0 ? r.stdout.trim() : "";
}

// First `worktree <path>` line of the porcelain list is always the MAIN
// worktree (git invariant); "" on any failure.
async function mainWorktree(cwd: string): Promise<string> {
  const out = await git("git worktree list --porcelain 2>/dev/null", cwd);
  for (const line of out.split("\n")) {
    if (line.startsWith("worktree ")) return line.slice(9);
  }
  return "";
}

// ` && (cd <main> && git worktree remove <wt> --force && git branch -D <br> || true)`
// when cwd is a LINKED worktree; "" when cwd IS the main worktree or detection
// fails. The subshell isolates the cd; `|| true` swallows residual errors so a
// missing branch / already-pruned worktree never poisons the chain.
async function worktreeCleanupTail(cwd: string): Promise<string> {
  const top = await git("git rev-parse --show-toplevel 2>/dev/null", cwd);
  const main = await mainWorktree(cwd);
  if (!top || !main || top === main) return "";
  const br = await git("git rev-parse --abbrev-ref HEAD 2>/dev/null", cwd);
  if (!br || br === "HEAD") return "";
  return (
    " && (cd " + shellSq(main) + " && git worktree remove " + shellSq(top) +
    " --force 2>/dev/null && git branch -D " + shellSq(br) + " 2>/dev/null || true)"
  );
}

// The integration branch every cycle must land on: origin/HEAD symbolic-ref,
// then origin/main|master existence, then the literal "main".
async function defaultBranch(cwd: string): Promise<string> {
  const head = await git("git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null", cwd);
  if (head) return head.includes("/") ? head.slice(head.indexOf("/") + 1) : head;
  if (await git("git rev-parse --verify --quiet origin/main 2>/dev/null", cwd)) return "main";
  if (await git("git rev-parse --verify --quiet origin/master 2>/dev/null", cwd)) return "master";
  return "main";
}

// Tally D (deleted) and A (added) lines in `--name-status` porcelain.
function tallyNameStatus(out: string): [number, number] {
  let d = 0;
  let a = 0;
  for (const line of out.split("\n")) {
    const t = line.trim();
    if (t.startsWith("D")) d++;
    else if (t.startsWith("A")) a++;
  }
  return [d, a];
}

// D/A counts of the diff this merge will land. Same-repo: merge-base(origin/
// main|master, HEAD)...HEAD (works BEFORE the PR exists — exactly when this
// hook fires). Cross-repo: the open PR's own diff via gh. [-1,-1] on any probe
// failure = "unknown → do not block" (fail-open).
async function deletionCounts(repoArg: string, cwd: string): Promise<[number, number]> {
  const probe = repoArg
    ? `gh pr diff${repoArg} --name-status 2>/dev/null`
    : `{ mb=$(git merge-base origin/main HEAD 2>/dev/null || git merge-base origin/master HEAD 2>/dev/null); [ -n "$mb" ] && git diff --name-status "$mb"...HEAD 2>/dev/null; }`;
  const r = await execShell(probe, { cwd: cwd || ".", timeoutMs: 15000 }).catch(() => null);
  if (!r || r.code !== 0 || !r.stdout.trim()) return [-1, -1];
  return tallyNameStatus(r.stdout);
}

function isMassDeletion([d, a]: [number, number]): boolean {
  if (d < 0) return false;
  return d > MAX_DELETIONS || (d > DEL_RATIO_FLOOR && d >= a * DEL_RATIO);
}

// Rewrite the real ` --base <oldv>` / ` --base=<oldv>` in the RAW command to
// `dflt`. `oldv` comes from the quote-stripped flag scan (a confirmed flag
// value, not body text), so the leading space pins a token boundary. No-op
// when absent/already default/only present pre-quoted.
function overrideBaseVal(cmd: string, oldv: string, dflt: string): string {
  if (!oldv || oldv === dflt) return cmd;
  for (const key of [` --base ${oldv}`, ` --base=${oldv}`]) {
    const idx = cmd.indexOf(key);
    if (idx >= 0) return cmd.slice(0, idx) + ` --base ${dflt}` + cmd.slice(idx + key.length);
  }
  return cmd;
}

// The full-cycle decision for a Bash command: null = not a target (pass
// through), deny = mass-deletion outlier, rewrite = appended merge/cleanup.
export async function prCreateRewrite(cmd: string, cwd: string): Promise<PrCycleRewrite | null> {
  if (!cmd.trim()) return null;
  if (cmd.includes(PR_CYCLE_MARK)) return null; // idempotent — already rewritten
  const toks = stripQuoted(cmd).split(/\s+/).filter(Boolean);
  if (!hasGhPrCreate(toks)) return null;
  if (cmd.includes("gh pr merge")) return null; // already contains a merge
  if (cmd.includes("--draft")) return null; // draft = review wanted, not merge

  const repo = flagValue(toks, "--repo");
  const repoArg = repo ? ` --repo ${repo}` : "";
  const counts = await deletionCounts(repoArg, cwd);
  if (isMassDeletion(counts)) {
    const [d, a] = counts;
    return {
      kind: "deny",
      reason:
        `PR_CYCLE_MASS_DELETION_BLOCK { D=${d}, A=${a} — 이 PR 머지가 대량 파일 삭제(D=${d}, 추가 A=${a})를 일으킴. ` +
        `stale-base squash-merge 회귀(anima #1105: 35190 파일 삭제)일 수 있음. 자동 머지 BLOCK — 의도된 삭제가 맞으면 ` +
        `stale base 여부를 확인한 뒤 \`gh pr merge\` 를 직접 수동 실행하세요 (pr-cycle 자동-tail 우회). ` +
        `아니면 origin/main 최신에서 fresh 분기해 다시 PR. }`,
    };
  }

  // `--head X` pins the PR# lookup to THAT branch (a create issued from a
  // different checkout otherwise resolves the WRONG PR from the cwd branch).
  const head = flagValue(toks, "--head");
  const vref = head ? " " + shellSq(head) : "";

  // cross-repo create: merge THAT repo's PR; never touch the local worktree
  // (it belongs to a different repo than the PR).
  if (repo) {
    const xcmd =
      cmd +
      ` && gh pr merge "$(gh pr view --repo ${repo}${vref} --json number -q .number)" --repo ${repo}` +
      ` --squash --admin --delete-branch  # ${PR_CYCLE_MARK}`;
    return {
      kind: "rewrite",
      command: xcmd,
      note:
        `pr-cycle: cross-repo (--repo ${repo}) — appended \`gh pr merge <PR#> --repo ${repo}\` ` +
        `(PR# via \`gh pr view --repo\`); no local worktree cleanup (cwd repo ≠ PR repo).`,
    };
  }

  // BASE-OVERRIDE: force a stacked `--base <parent>` to the repo default so the
  // squash-merge lands on the integration branch (and the chained cleanup runs).
  const dflt = await defaultBranch(cwd);
  const baseVal = flagValue(toks, "--base");
  const cmdB = overrideBaseVal(cmd, baseVal, dflt);
  const oldBase = cmdB !== cmd ? baseVal : "";

  const wtTail = await worktreeCleanupTail(cwd);
  const mergeTail = ` && gh pr merge "$(gh pr view${vref} --json number -q .number)" --squash --admin --delete-branch`;
  const newCmd = cmdB + mergeTail + wtTail + `  # ${PR_CYCLE_MARK}`;
  let note = wtTail
    ? "pr-cycle: appended merge + worktree cleanup (cwd is a linked worktree — cd main + `git worktree remove --force` + `git branch -D` after merge) — create→merge atomic (cycle-docs-pr)."
    : "pr-cycle: appended ` && gh pr merge --squash --admin --delete-branch` — create→merge atomic (cycle-docs-pr).";
  if (oldBase) {
    note += ` BASE-OVERRIDE: rewrote \`--base ${oldBase}\` → \`--base ${dflt}\` so the cycle lands on the integration branch (no stacked-parent merge / worktree pile-up).`;
  }
  return { kind: "rewrite", command: newCmd, note };
}
