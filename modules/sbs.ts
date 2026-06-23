// sidecar sbs [auto[:<axis>]|manual] [<task>]
// Print the resolved mode (deterministic, via recommend resolve-mode) + the
// plan-first step-by-step runbook for the agent to follow. The disambiguation
// itself is performed by the agent reading the printed runbook;
// the sidecar supplies the authoritative mode + the runbook body.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SIDECAR_ROOT } from "../lib/paths.ts";
import { info } from "../lib/log.ts";
import { resolveMode } from "./recommend.ts";

export async function runSbs(args: string[]): Promise<number> {
  const raw = args.join(" ");
  process.stdout.write("# /sbs — step-by-step (mode resolved by sidecar)\n\n");
  resolveMode(raw); // prints `mode: …` + `resolved: …`
  process.stdout.write("\n---\n\n");

  const tpl = resolve(SIDECAR_ROOT, "templates", "sbs.md");
  if (existsSync(tpl)) {
    process.stdout.write(readFileSync(tpl, "utf8"));
  } else {
    info("sbs runbook template missing (templates/sbs.md)");
  }
  return 0;
}
