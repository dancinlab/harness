// sidecar worktree {scan|gc|guard <cmd>}
// Enforces the no-pileup / no-stranded-work principle:
//   scan         classify every linked worktree (clean/dirty/unpushed/[gone]) and
//                LOUDLY flag STRANDED ones — uncommitted or unpushed work left in a
//                worktree. Exit 1 when any are stranded (usable as a gate).
//   gc           eagerly sweep merged + dangling worktrees/branches — ALL linked
//                worktrees (sibling dirs, /tmp, .worktrees/*), not just agent paths;
//                agent-only scope let non-agent worktrees pile up cross-repo. Reap
//                signals: [gone] upstream (squash-safe merged signal) for every
//                worktree; the HEAD-age > worktree.maxAgeDays (default 3) backstop
//                stays AGENT-ONLY so long-lived experiment lanes are never age-reaped.
//                An aged tip with un-pushed commits is first preserved under
//                refs/reaped/<branch> (fully recoverable). A merged([gone])-but-dirty
//                worktree — the permanent-strand trap (uncommitted state/ outputs) —
//                has its uncommitted files salvaged to worktree.salvageDir under the
//                main checkout, then is reaped. UNCONDITIONAL live-work guards skip
//                unmerged-dirty / recently-touched (<1h) / locked worktrees, so an
//                active task is NEVER wiped. Always exits 0 (non-blocking).
//   guard <cmd>  advisory for `git worktree add`: if stranded work already exists,
//                steer to finish/clean it BEFORE starting new work (principle 3);
//                plus the branch-reuse stale-base warning.
import { execShell } from "../lib/exec.ts";
import { repoPath, config } from "../lib/config.ts";
import { info, ok, warn, loudFail } from "../lib/log.ts";

async function git(cmd: string, cwd?: string): Promise<{ code: number; out: string }> {
  const r = await execShell(cmd, { cwd: cwd ?? repoPath(".") });
  return { code: r.code, out: (r.stdout + r.stderr).trim() };
}

export interface WT {
  path: string;
  branch: string;
  locked: boolean;
  isMain: boolean;
  isAgent: boolean;
  dirty: boolean;
  ahead: number; // commits not on upstream (unpushed)
  track: string; // upstream:track, e.g. "[gone]" / "" / "[ahead 2]"
  stranded: boolean; // dirty OR unpushed → abandoned work
}

function isAgentPath(p: string): boolean {
  if (p.includes("/.claude/worktrees/")) return true;
  const base = p.split("/").pop() ?? "";
  return base.startsWith("agent-") || base.startsWith("worktree-agent-");
}

export async function classify(): Promise<WT[]> {
  const list = (await git("git worktree list --porcelain")).out;
  if (!list) return [];
  const blocks = list.split(/\n\s*\n/);
  const out: WT[] = [];
  for (let bi = 0; bi < blocks.length; bi++) {
    const b = blocks[bi];
    const path = (b.match(/^worktree (.+)$/m) || [])[1];
    if (!path) continue;
    const branch = (b.match(/^branch refs\/heads\/(.+)$/m) || [])[1] ?? "";
    const locked = /^locked/m.test(b);
    const isMain = bi === 0;
    const dirty = !isMain && (await git("git status --porcelain", path)).out.length > 0;
    const track = branch ? (await git(`git for-each-ref --format='%(upstream:track)' refs/heads/${JSON.stringify(branch)}`, path)).out : "";
    // unpushed: commits on HEAD not on upstream; if no upstream, count commits beyond origin/main
    let ahead = 0;
    if (!isMain) {
      const up = (await git("git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null", path)).out;
      const base = up || "origin/main";
      const rl = (await git(`git rev-list --count ${JSON.stringify(base)}..HEAD 2>/dev/null`, path)).out;
      ahead = parseInt(rl || "0", 10) || 0;
      if (!up && track !== "[gone]") {
        // no upstream at all → only "unpushed" if it carries its own commits
        ahead = ahead > 0 ? ahead : 0;
      }
    }
    const stranded = !isMain && (dirty || ahead > 0);
    out.push({ path, branch, locked, isMain, isAgent: isAgentPath(path), dirty, ahead, track, stranded });
  }
  return out;
}

export async function strandedWorktrees(): Promise<WT[]> {
  return (await classify()).filter((w) => w.stranded);
}

async function recentlyTouched(path: string): Promise<boolean> {
  const ct = parseInt((await git("git log -1 --format=%ct 2>/dev/null", path)).out || "0", 10);
  if (!ct) return false;
  return Date.now() / 1000 - ct < 3600; // HEAD commit < 1h ago
}

// Days since the worktree's HEAD commit (Infinity if unknown → treated as old).
async function headAgeDays(path: string): Promise<number> {
  const ct = parseInt((await git("git log -1 --format=%ct 2>/dev/null", path)).out || "0", 10);
  if (!ct) return Infinity;
  return (Date.now() / 1000 - ct) / 86400;
}

async function scan(): Promise<number> {
  const wts = await classify();
  const linked = wts.filter((w) => !w.isMain);
  if (!linked.length) {
    info("worktree: 0 linked — clean.");
    return 0;
  }
  const stranded = linked.filter((w) => w.stranded);
  info(`worktree: ${linked.length} linked · ${stranded.length} stranded`);
  for (const w of linked) {
    const flags = [
      w.dirty ? "dirty" : "",
      w.ahead > 0 ? `unpushed:${w.ahead}` : "",
      w.track === "[gone]" ? "merged[gone]" : "",
      w.locked ? "locked" : "",
    ].filter(Boolean).join(" ");
    const mark = w.stranded ? "⚠" : w.track === "[gone]" ? "🧹" : "✓";
    info(`  ${mark} ${w.path}  [${w.branch || "detached"}]  ${flags || "clean"}`);
  }
  if (stranded.length) {
    loudFail(`worktree: ${stranded.length} STRANDED — finish via 'sidecar pr-cycle' or clean (commit+push / git worktree remove) before new work.`);
    return 1;
  }
  return 0;
}

// Copy every uncommitted file (modified + untracked) out of a merged-but-dirty
// worktree into <mainCheckout>/<salvageDir>/<branch-or-basename>/ before reaping —
// preserve-state: the outputs survive in the git-tracked state/ root, the worktree
// doesn't. Deletions carry no content and are skipped.
async function salvageDirty(w: WT, salvageDir: string): Promise<number> {
  const name = (w.branch || w.path.split("/").pop() || "unknown").replace(/[^A-Za-z0-9._-]+/g, "-");
  const destRoot = repoPath(`${salvageDir}/${name}`);
  const status = (await git("git status --porcelain", w.path)).out.split("\n").filter(Boolean);
  let saved = 0;
  for (const line of status) {
    if (/^.?D/.test(line.slice(0, 2))) continue; // deletion — nothing to copy
    let rel = line.slice(3).trim();
    const arrow = rel.indexOf(" -> ");
    if (arrow >= 0) rel = rel.slice(arrow + 4); // rename: keep the new path
    rel = rel.replace(/^"|"$/g, "").replace(/\/$/, "");
    const src = `${w.path}/${rel}`;
    const dstParent = `${destRoot}/${rel}`.replace(/\/[^/]+$/, "");
    const r = await execShell(
      `mkdir -p ${JSON.stringify(dstParent)} && cp -R ${JSON.stringify(src)} ${JSON.stringify(dstParent)}/`
    );
    if (r.code === 0) saved++;
    else warn(`  salvage failed (${rel}): ${(r.stdout + r.stderr).trim()}`);
  }
  return saved;
}

async function gc(): Promise<number> {
  const wts = await classify();
  const main = wts.find((w) => w.isMain)?.path;
  if (main) await git("git fetch -p origin", main);
  // re-classify after fetch so [gone] is fresh
  const fresh = await classify();
  let swept = 0;

  const maxAgeDays = config().worktree?.maxAgeDays ?? 3;
  const salvageDir = config().worktree?.salvageDir ?? "state/worktree-salvage";
  for (const w of fresh) {
    if (w.isMain) continue;
    if (w.locked) continue; // another live checkout
    if (await recentlyTouched(w.path)) { info(`  ⏭ skip (recent <1h): ${w.path}`); continue; }
    const gone = w.track === "[gone]"; // pushed + remote-deleted (squash-safe)
    // Age backstop stays AGENT-ONLY: non-agent worktrees (sibling dirs, .worktrees/*)
    // may be intentional long-lived experiment lanes — reap those on [gone] only.
    const aged = w.isAgent && maxAgeDays > 0 && (await headAgeDays(w.path)) > maxAgeDays;
    if (!gone && !aged) continue; // live/recent work → leave it
    if (w.dirty) {
      if (!gone) { info(`  ⏭ skip (dirty, unmerged): ${w.path}`); continue; }
      // merged-but-dirty = the permanent-strand trap: the branch is done but
      // uncommitted outputs pin the worktree. Salvage them, then reap.
      const saved = await salvageDirty(w, salvageDir);
      info(`  📦 salvaged ${saved} uncommitted file(s) → ${salvageDir}/`);
    }
    // Aged reap may carry un-pushed commits (the [gone] path is already merged).
    // Preserve the tip under refs/reaped/ so the work stays fully recoverable.
    if (aged && !gone && w.ahead > 0 && w.branch) {
      const sha = (await git("git rev-parse --short HEAD", w.path)).out;
      await git(`git update-ref refs/reaped/${w.branch} HEAD`, w.path);
      info(`  🔖 preserved aged tip → refs/reaped/${w.branch} (${sha}, unpushed:${w.ahead})`);
    }
    const rm = await git(`git worktree remove --force ${JSON.stringify(w.path)}`);
    if (rm.code === 0) {
      if (w.branch) await git(`git branch -D ${JSON.stringify(w.branch)}`);
      info(`  🧹 swept ${gone ? "merged[gone]" : `aged(>${maxAgeDays}d)`} worktree: ${w.path}`);
      swept++;
    }
  }
  await git("git worktree prune");

  // dangling AGENT branches (no worktree) whose upstream is [gone]
  const branches = (await git("git for-each-ref --format='%(refname:short) %(upstream:track)' refs/heads")).out.split("\n");
  const wtBranches = new Set(fresh.map((w) => w.branch).filter(Boolean));
  for (const line of branches) {
    const [br, ...rest] = line.trim().split(/\s+/);
    if (!br) continue;
    if (!(br.startsWith("agent-") || br.startsWith("worktree-agent-"))) continue;
    if (wtBranches.has(br)) continue; // still has a worktree
    if (rest.join(" ") !== "[gone]") continue;
    if ((await git(`git branch -D ${JSON.stringify(br)}`)).code === 0) {
      info(`  🧹 deleted dangling branch: ${br}`);
      swept++;
    }
  }

  const stranded = (await strandedWorktrees());
  if (stranded.length) warn(`worktree gc: ${stranded.length} stranded worktree(s) left untouched (active work) — finish via 'sidecar pr-cycle'.`);
  if (swept === 0 && !stranded.length) ok("worktree gc: nothing to sweep — clean.");
  else if (swept > 0) ok(`worktree gc: swept ${swept} merged/dangling item(s).`);
  return 0;
}

// Advisory for `git worktree add` — non-blocking. Returns the advisory text or "".
export async function worktreeAddAdvisory(cmd: string): Promise<string> {
  if (!/\bgit\s+worktree\s+add\b/.test(cmd)) return "";
  const lines: string[] = [];
  const stranded = await strandedWorktrees();
  if (stranded.length) {
    lines.push(
      `⚠ ${stranded.length} stranded worktree(s) already exist (uncommitted/unpushed work). 원칙: 방치된 작업을 먼저 완료(sidecar pr-cycle)/정리한 뒤 새 작업을 시작하세요:`
    );
    for (const w of stranded) lines.push(`    • ${w.path} [${w.branch}] ${w.dirty ? "dirty " : ""}${w.ahead ? "unpushed:" + w.ahead : ""}`);
  }
  // branch-reuse stale-base warning (anima #1105)
  const m = cmd.match(/git\s+worktree\s+add\b.*?-b\s+(\S+)/);
  if (m) {
    const br = m[1].replace(/['"]/g, "");
    const exists = (await git(`git rev-parse --verify -q ${JSON.stringify(br)}`)).code === 0;
    if (exists) lines.push(`⚠ branch '${br}' already exists — reusing a stale local branch carries stale-base revert risk; cut a fresh per-PR branch from origin/main (e.g. ${br}-<ts>).`);
  }
  return lines.join("\n");
}

export async function runWorktree(args: string[]): Promise<number> {
  const sub = args[0] ?? "scan";
  if (sub === "scan" || sub === "status") return scan();
  if (sub === "gc") return gc();
  if (sub === "guard") {
    const adv = await worktreeAddAdvisory(args.slice(1).join(" "));
    if (adv) process.stderr.write(adv + "\n");
    return 0;
  }
  info("usage: sidecar worktree {scan|gc|guard <cmd>}");
  return 1;
}
