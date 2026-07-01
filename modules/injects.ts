// `sidecar injects` — read-only per-turn inject footprint report.
//
// "You can't manage what you don't measure." Every turn, sidecar RE-INJECTS a set of
// context blocks (commons · recommend · CLAUDE.md · easy · ing · load …). Their SUM is
// the context-rot budget — re-spent every single turn, silently making the agent dumber
// as it grows. This command surfaces that budget: per-source bytes/≈tokens/cap plus the
// aggregate vs lint.injectBudgetBytes, mirroring the exact accounting the INJECT-BUDGET
// lint gate uses (modules/lint.ts injectCapViolations). READ-ONLY — never writes.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config, repoPath } from "../lib/config.ts";
import { SIDECAR_ROOT } from "../lib/paths.ts";
import { info } from "../lib/log.ts";

function bytesOf(abs: string): number {
  try {
    return Buffer.byteLength(readFileSync(abs, "utf8"), "utf8");
  } catch {
    return 0;
  }
}

const tok = (b: number): number => Math.round(b / 4);

interface Row {
  source: string;
  bytes: number | null; // null = dynamic (rendered at runtime, no static size)
  cap: number | null; // per-source byte cap (null = no per-source cap)
  counted: boolean; // does this spend the aggregate injectBudgetBytes?
}

// pad helpers (fixed-width table)
const rpad = (s: string, n: number): string => (s.length >= n ? s : s + " ".repeat(n - s.length));
const lpad = (s: string, n: number): string => (s.length >= n ? s : " ".repeat(n - s.length) + s);

export async function runInjects(args: string[]): Promise<number> {
  if (args[0] === "-h" || args[0] === "--help" || args[0] === "help") {
    info("usage: sidecar injects   — per-turn inject footprint report (read-only)");
    return 0;
  }
  const cfg = config();
  const caps = cfg.lint?.injectCaps ?? {};
  const extras = cfg.lint?.injectBudgetExtra ?? [];
  const budget = cfg.lint?.injectBudgetBytes ?? 0;

  const rows: Row[] = [];

  // 1) single-file injectCaps keys (dir keys ending "/" expand to many variants of which
  //    only ONE ships per turn, so they don't count toward the aggregate — mirror lint).
  for (const [key, cap] of Object.entries(caps)) {
    if (key.endsWith("/")) continue; // skip dir/variant caps (not summed)
    rows.push({ source: key, bytes: existsSync(repoPath(key)) ? bytesOf(repoPath(key)) : 0, cap: cap || null, counted: true });
  }
  // 2) injectBudgetExtra — carry their OWN format lint (not byte-capped) but still spend
  //    the per-turn budget (e.g. repo-root CLAUDE.md via the claudemd inject).
  for (const f of extras) {
    rows.push({ source: f, bytes: existsSync(repoPath(f)) ? bytesOf(repoPath(f)) : 0, cap: null, counted: true });
  }

  // aggregate = sum of counted rows (identical to lint.ts injectCapViolations `total`).
  const total = rows.filter((r) => r.counted).reduce((s, r) => s + (r.bytes ?? 0), 0);

  // 3) the other dynamic per-turn injects — emitted every turn but rendered at runtime
  //    (board state / live resource readout / prefs-selected style file), so they are NOT
  //    part of the fixed aggregate budget. Surfaced for visibility only. easy is file-backed
  //    (styles/easy.<lang>.md · base measured); ing/load have no static size.
  const easyBase = resolve(SIDECAR_ROOT, "styles", "easy.md");
  const dyn: Row[] = [
    { source: "easy   (styles/easy.*.md)", bytes: existsSync(easyBase) ? bytesOf(easyBase) : null, cap: null, counted: false },
    { source: "ing    (ING.jsonl board)", bytes: null, cap: null, counted: false },
    { source: "load   (macOS resource readout)", bytes: null, cap: null, counted: false },
  ];

  // ---- render ----
  const W = 32; // source column width
  info("per-turn inject footprint (context-rot budget · read-only)");
  info("");
  info(`${rpad("source", W)}${lpad("bytes", 8)}${lpad("~tok", 7)}${lpad("cap", 9)}`);
  info("─".repeat(W + 8 + 7 + 9 + 4));
  for (const r of rows) {
    const b = r.bytes ?? 0;
    const capCell = r.cap ? String(r.cap) : "budget";
    const badge = r.cap ? (b > r.cap ? " 🔴" : " 🟢") : "";
    info(`${rpad(r.source, W)}${lpad(String(b), 8)}${lpad(String(tok(b)), 7)}${lpad(capCell, 9)}${badge}`);
  }
  info("─".repeat(W + 8 + 7 + 9 + 4));
  const overall = budget > 0 ? (total > budget ? " 🔴" : " 🟢") : "";
  const budgetCell = budget > 0 ? `/ ${budget}B` : "(no injectBudgetBytes set)";
  info(`${rpad("TOTAL (counted)", W)}${lpad(String(total), 8)}${lpad(String(tok(total)), 7)}${lpad(budgetCell, 9 > budgetCell.length ? 9 : budgetCell.length)}${overall}`);
  info("  = Σ single-file injectCaps sources + injectBudgetExtra  vs  lint.injectBudgetBytes");
  info("");
  info("dynamic per-turn injects (rendered at runtime · NOT in the fixed budget):");
  for (const r of dyn) {
    const bCell = r.bytes == null ? "dyn" : String(r.bytes);
    const tCell = r.bytes == null ? "—" : String(tok(r.bytes));
    info(`  ${rpad(r.source, W)}${lpad(bCell, 8)}${lpad(tCell, 7)}`);
  }
  info("");
  info("note: each per-turn inject emits ONCE across all wired surfaces (dedup via lib/inject.ts) —");
  info("      double-wired plugin + global hooks do NOT re-spend the budget twice. Trim a SOURCE to");
  info("      shrink the footprint; per-turn injects are never truncated at emit (inject-lint rule).");
  return 0;
}
