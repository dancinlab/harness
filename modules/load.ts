// sidecar load {show|inject}
// Per-turn macOS resource pressure readout, injected as a UserPromptSubmit
// additionalContext line so the agent surfaces it every reply.
//
// Why both CPU AND memory: a Mac that "keeps dying" is almost always memory
// pressure (compressor + swap blowup) rather than CPU saturation — so we report
// the load average AND the kernel memory-pressure level + RAM-used% + swap-used,
// flagging ⚠️ when any axis enters a danger band.
//
// Cost: only sysctl + vm_stat (cheap, instant). We deliberately avoid the
// `memory_pressure` CLI — it does a full system scan and can take seconds, which
// is unacceptable for a hook that fires on every prompt.
import { execSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { emitInject } from "../lib/inject.ts";
import { info } from "../lib/log.ts";
import { readStdin } from "../lib/exec.ts";
import { config } from "../lib/config.ts";
import { REPO_ROOT } from "../lib/paths.ts";

interface Snapshot {
  load1: number;
  cores: number;
  cpuLight: string;
  ramUsedPct: number;
  pressure: number; // 1 normal · 2 warn · 4 critical
  pressureLabel: string;
  ramLight: string;
  swapUsedGiB: number;
  swapLight: string;
  worktrees: number; // extra git worktrees in the cwd repo (main checkout excluded)
  labWorktrees: number; // linked worktrees across ALL repos under the lab root (-1 unknown)
  danger: boolean;
}

function sh(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

function light(value: number, warn: number, crit: number): string {
  if (value >= crit) return "🔴";
  if (value >= warn) return "🟡";
  return "🟢";
}

export function readSnapshot(): Snapshot | null {
  // load average — "{ 1m 5m 15m }"
  const la = sh("sysctl -n vm.loadavg");
  const m = la.match(/([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (!m) return null; // non-macOS or sysctl missing → caller skips injection
  const load1 = parseFloat(m[1]);
  const cores = parseInt(sh("sysctl -n hw.ncpu") || "1", 10) || 1;
  const cpuLight = light(load1 / cores, 0.7, 1.0);

  // memory — parse vm_stat pages; used ≈ active + wired + compressor (the pages
  // apps actually hold and the kernel can't cheaply reclaim).
  const total = parseInt(sh("sysctl -n hw.memsize") || "0", 10);
  const vm = sh("vm_stat");
  const pg = (re: RegExp): number => {
    const x = vm.match(re);
    return x ? parseInt(x[1], 10) : 0;
  };
  const pageSize = (() => {
    const x = vm.match(/page size of (\d+) bytes/);
    return x ? parseInt(x[1], 10) : 16384;
  })();
  const active = pg(/Pages active:\s+(\d+)/);
  const wired = pg(/Pages wired down:\s+(\d+)/);
  const compressor = pg(/Pages occupied by compressor:\s+(\d+)/);
  const usedBytes = (active + wired + compressor) * pageSize;
  const ramUsedPct = total > 0 ? Math.round((usedBytes / total) * 100) : 0;

  const pressure = parseInt(sh("sysctl -n kern.memorystatus_vm_pressure_level") || "1", 10) || 1;
  const pressureLabel = pressure >= 4 ? "critical" : pressure >= 2 ? "warn" : "normal";
  // RAM light: the worse of used% band and kernel pressure level.
  const ramByPct = light(ramUsedPct, 80, 90);
  const ramByPressure = pressure >= 4 ? "🔴" : pressure >= 2 ? "🟡" : "🟢";
  const ramLight = ["🔴", "🟡", "🟢"].find((l) => l === ramByPct || l === ramByPressure) ?? "🟢";

  // swap — "total = X used = Y free = Z"
  const sw = sh("sysctl -n vm.swapusage");
  const su = sw.match(/used\s*=\s*([\d.]+)([MG])/);
  let swapUsedGiB = 0;
  if (su) {
    const n = parseFloat(su[1]);
    swapUsedGiB = su[2] === "G" ? n : n / 1024;
  }
  const swapLight = light(swapUsedGiB, 2, 6);

  // extra git worktrees in the current repo (main checkout excluded) — a quick
  // hygiene gauge so stranded worktrees from isolated agents are visible every turn.
  const wtRaw = sh("git worktree list --porcelain 2>/dev/null");
  const worktrees = Math.max(0, (wtRaw.match(/^worktree /gm) || []).length - 1);
  const labWorktrees = countLabWorktrees();

  const danger = cpuLight === "🔴" || ramLight === "🔴" || swapLight === "🔴" || pressure >= 2;
  return {
    load1, cores, cpuLight,
    ramUsedPct, pressure, pressureLabel, ramLight,
    swapUsedGiB, swapLight, worktrees, labWorktrees, danger,
  };
}

// Lab-wide linked-worktree count — the per-repo gauge only sees the cwd repo, so a
// sibling repo could hold 40+ worktrees while every other session reads `wt 0 🟢`
// (the cross-repo pileup blind spot). Counts .git/worktrees/ admin entries of every
// immediate child repo of worktree.labRoot (default: parent of the repo root) —
// readdir only, no subprocess, so it stays per-turn cheap. -1 = root unreadable.
function countLabWorktrees(): number {
  try {
    const root = config().worktree?.labRoot || dirname(REPO_ROOT);
    let n = 0;
    for (const e of readdirSync(root, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      try {
        n += readdirSync(join(root, e.name, ".git", "worktrees")).length;
      } catch { /* not a repo / no linked worktrees */ }
    }
    return n;
  } catch {
    return -1;
  }
}

// Local-clock stamp appended to the readout — the agent has no real-time clock
// otherwise (the session date in context is fixed at start), so surfacing the
// actual current date+time every turn keeps time-sensitive reasoning honest.
function nowStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const dow = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}(${dow}) ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function line(s: Snapshot): string {
  const swap = s.swapUsedGiB >= 1 ? `${s.swapUsedGiB.toFixed(1)}G` : `${Math.round(s.swapUsedGiB * 1024)}M`;
  const head = s.danger ? "⚠️ " : "";
  return (
    `${head}CPU ${s.load1.toFixed(2)}/${s.cores} ${s.cpuLight} · ` +
    `RAM ${s.ramUsedPct}%(${s.pressureLabel}) ${s.ramLight} · ` +
    `swap ${swap} ${s.swapLight} · ` +
    `wt ${s.worktrees} ${light(s.worktrees, 3, 10)}` +
    (s.labWorktrees >= 0 ? `/lab ${s.labWorktrees} ${light(s.labWorktrees, 10, 30)}` : "") + " · " +
    `🕐 ${nowStamp()}`
  );
}

function body(s: Snapshot): string {
  const warn = s.danger
    ? "\n# ⚠️ 자원 위험 — 사용자에게 무거운 작업(대량 빌드·병렬 agent·GPU) 자제 또는 정리를 권하고, 필요시 메모리 점유 프로세스 정리를 제안하라."
    : "";
  return (
    "# mac load (report this one line at the TOP of every user-facing reply — hard rule)\n" +
    line(s) + "\n" +
    "- CPU = load1/cores (🟢<0.7 🟡<1.0 🔴≥1.0) · RAM = active+wired+compressor used% + kernel pressure(normal/warn/critical) · swap used (🟢<2G 🟡<6G 🔴≥6G).\n" +
    "- A Mac that dies under load fails on MEMORY (compressor+swap), not CPU — when RAM/swap light is 🔴 or pressure≥warn, say so loudly.\n" +
    "- wt = extra git worktrees, this repo (🟢0-2 🟡3-9 🔴≥10) / lab = 전체 repo 합산 (🟢<10 🟡<30 🔴≥30) — 누적되면 해당 repo 에서 `sidecar worktree gc`.\n" +
    "- 🕐 = the machine's REAL current local date+time (the session-start date in context is fixed; trust this line for 'now')." +
    warn + "\n"
  );
}

function eventName(): string {
  try {
    const j = JSON.parse(readStdin());
    return String(j.hook_event_name ?? j.hookEventName ?? "UserPromptSubmit");
  } catch {
    return "UserPromptSubmit";
  }
}

export async function runLoad(args: string[]): Promise<number> {
  const sub = args[0] ?? "show";
  const snap = readSnapshot();

  if (sub === "inject") {
    if (!snap) return 0; // non-macOS: silently no-op
    const ev = eventName();
    emitInject("load", ev, body(snap));
    return 0;
  }
  if (sub === "show") {
    if (!snap) {
      info("load: unavailable (non-macOS or sysctl missing)");
      return 0;
    }
    info(line(snap));
    return 0;
  }
  info("usage: sidecar load {show|inject}");
  return 1;
}
