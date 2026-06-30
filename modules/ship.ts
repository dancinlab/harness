// sidecar ship [--no-doc]
// SIDECAR-REPO-ONLY propagation: ship is NOT a generic per-repo command. Steps 2-3
// (self-update the global sidecar CLI · re-mirror sidecar's own commands/) only make
// sense in the sidecar SOURCE repo — it propagates SIDECAR's own changes across the
// surfaces a sidecar install lives on. In any other repo, use `sidecar pr-cycle` for a
// plain verified merge.
//
//   pre. sidecar-repo gate — refuse outside the sidecar source repo
//   0. inject-bloat guard — context-rot recurrence guard (re-injected sources under cap)
//   1. pr-cycle    — doc-gate → push → PR → verified merge → local main ff-sync
//   2. self-update — git-pull the GLOBAL CLI clone (~/.sidecar/cli) to the just-merged main
//   3. shadow      — re-mirror commands/ → ~/.claude/commands/ as bare /cmd delegators
//
import { existsSync } from "node:fs";
import { info, ok, loudFail } from "../lib/log.ts";
import { repoPath } from "../lib/config.ts";
import { injectCapViolations } from "./lint.ts";
import { runPrCycle } from "./pr-cycle.ts";
import { runSelfUpdate } from "./setup.ts";
import { runShadow } from "./shadow.ts";

// The sidecar SOURCE repo is the one that carries the CLI itself (cli/index.ts) and the
// shadow source (commands/) — uniquely identifying it, config-free.
function isSidecarRepo(): boolean {
  return existsSync(repoPath("cli/index.ts")) && existsSync(repoPath("modules/shadow.ts")) && existsSync(repoPath("commands"));
}

export async function runShip(args: string[]): Promise<number> {
  // pre. sidecar-repo gate — ship is sidecar-development-only (self-update + shadow act on
  // the sidecar install, meaningless elsewhere). Not generic; other repos use pr-cycle.
  if (!isSidecarRepo()) {
    loudFail("ship: sidecar-repo ONLY — it self-updates the global sidecar CLI + re-mirrors sidecar's commands (no-op/meaningless in other repos). For a verified merge here, use `sidecar pr-cycle`.");
    return 1;
  }

  // 0. inject-bloat guard — the "AI gets dumber" (context-rot) recurrence guard as ship's
  // FINAL pre-flight: every source re-injected to the agent each turn must stay under its
  // byte cap, or it silently degrades all future turns. sidecar-specific (injectCaps lists
  // this repo's inject sources). No bypass (no-escape-hatch): trim the source, then ship.
  info("ship: 1/4 — inject-bloat guard (context-rot · injectCaps)…");
  const bloated = injectCapViolations();
  if (bloated.length) {
    for (const v of bloated) loudFail(`ship: INJECT-OVERSIZED ${v.file} — ${v.msg}`);
    loudFail("ship: STOP — inject source over cap = context-rot risk (AI 멍청해짐 재발). trim it under cap, then re-run `sidecar ship`.");
    return 1;
  }

  // forward pr-cycle flags (e.g. --no-doc for config/data-only changes)
  info("ship: 2/4 — pr-cycle (verified merge to main)…");
  const merged = await runPrCycle(args);
  if (merged !== 0) {
    loudFail("ship: pr-cycle failed — STOP. global CLI + shadow NOT touched (nothing merged to propagate).");
    return merged;
  }

  // global CLI clone (~/.sidecar/cli) git-pulls the merged main — terminal `sidecar …` current.
  info("ship: 3/4 — self-update (global CLI ~/.sidecar/cli)…");
  const updated = await runSelfUpdate([]);
  if (updated !== 0) {
    loudFail("ship: self-update failed — merge landed but global CLI is STALE. fix then re-run `sidecar self-update`.");
    return updated;
  }

  // re-mirror commands/ so any NEW slash delegator appears in the picker (shadow is the
  // command source — plugin.json ships commands:[], so this step is what makes /cmd visible).
  info("ship: 4/4 — shadow (mirror slash commands → ~/.claude/commands)…");
  const mirrored = runShadow([]);
  if (mirrored !== 0) {
    loudFail("ship: shadow failed — merge + global CLI current, but new slash commands may be missing. re-run `sidecar shadow`.");
    return mirrored;
  }

  ok("ship: propagated to all surfaces (merge ✓ · global CLI ✓ · shadow ✓).");
  info("  • new slash commands → reload Claude Code (/reload-plugins or restart) to pick them up.");
  info("  • plugin-install users (/plugin) refresh separately via `/plugin update` after a version bump.");
  return 0;
}
