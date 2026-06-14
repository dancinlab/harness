// harness upstream [list | fix <name|repo>]
// In-session upstream-fix driver. When downstream work surfaces an upstream
// (e.g. hexa-lang) bug/improvement, fix it AT SOURCE in this session instead of
// deferring to an inbox memo. `list` shows declared upstreams (config.upstreams);
// `fix <name>` resolves the repo and prints the in-session fix runbook.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { HARNESS_ROOT } from "../lib/paths.ts";
import { config } from "../lib/config.ts";
import { info } from "../lib/log.ts";

export async function runUpstream(args: string[]): Promise<number> {
  const sub = args[0] ?? "list";
  const ups = config().upstreams ?? [];

  if (sub === "list") {
    if (!ups.length) {
      info("upstream: none declared (harness.config.json → upstreams[]).");
      return 0;
    }
    info("declared upstreams (fix in-session, not inbox-only):");
    for (const u of ups) info(`  • ${u.name}  →  ${u.repo}${u.branch ? " @" + u.branch : ""}`);
    return 0;
  }

  if (sub === "fix") {
    const key = args[1];
    const u = ups.find((x) => x.name === key || x.repo === key || x.repo.endsWith("/" + (key ?? "")));
    const repo = u?.repo ?? key;
    if (!repo) {
      info("usage: harness upstream fix <name|owner/repo>");
      return 1;
    }
    process.stdout.write(`# /upstream fix — ${repo}\n\n`);
    const tpl = resolve(HARNESS_ROOT, "templates", "upstream.md");
    if (existsSync(tpl)) process.stdout.write(readFileSync(tpl, "utf8"));
    process.stdout.write(`\n---\ntarget: ${repo}${u?.branch ? " @" + u.branch : ""}\n`);
    process.stdout.write(`clone: gh repo clone ${repo} /tmp/${repo.split("/").pop()} && cd $_ && git checkout -B fix/<slug> origin/main\n`);
    return 0;
  }

  info("usage: harness upstream {list | fix <name|owner/repo>}");
  return 1;
}
