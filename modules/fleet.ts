// harness fleet [name:goal,...|go|stop|status]
// Perpetual multi-lane orchestrator runbook (sidecar fleet parity). Manages a
// lane roster at .harness/fleet/active and prints the runbook the agent follows
// (fire-on-arrival: each lane relaunches its next round the moment it lands).
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { HARNESS_ROOT, REPO_ROOT } from "../lib/paths.ts";
import { info, ok } from "../lib/log.ts";

function rosterPath(): string {
  return resolve(REPO_ROOT, ".harness", "fleet", "active");
}

function printRunbook(): void {
  const tpl = resolve(HARNESS_ROOT, "templates", "fleet.md");
  if (existsSync(tpl)) process.stdout.write(readFileSync(tpl, "utf8"));
}

export async function runFleet(args: string[]): Promise<number> {
  const arg = args.join(" ").trim();
  const roster = rosterPath();

  if (arg === "stop") {
    if (existsSync(roster)) rmSync(roster);
    ok("fleet: roster cleared — in-flight lanes drain, no relaunch.");
    return 0;
  }
  if (arg === "status") {
    if (!existsSync(roster)) {
      info("fleet: no active roster.");
      return 0;
    }
    info("fleet lanes (.harness/fleet/active):");
    for (const l of readFileSync(roster, "utf8").split("\n").filter(Boolean)) info(`  • ${l}`);
    return 0;
  }

  // open / continue
  if (arg && arg !== "go") {
    // "name:goal, name:goal" → write roster (lane names)
    const lanes = arg.split(",").map((s) => s.trim().split(":")[0].trim()).filter(Boolean);
    if (lanes.length) {
      mkdirSync(dirname(roster), { recursive: true });
      writeFileSync(roster, lanes.join("\n") + "\n", "utf8");
      info(`fleet: roster armed with ${lanes.length} lane(s): ${lanes.join(", ")}`);
    }
  } else if (!existsSync(roster)) {
    info("fleet: no roster + no specs — pass `name:goal, …` or infer lanes from the prior turn.");
  }

  process.stdout.write("# /fleet — engage (mode: " + (arg === "go" ? "continue" : "open") + ")\n\n");
  printRunbook();
  return 0;
}
