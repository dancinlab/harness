// harness update [--hooks]
// Pull the latest harness engine into THIS repo. The engine is vendored as the
// `.harness-engine` git submodule pinned to a branch (harness-hardcore); a new
// engine feature lands there, and each consuming repo adopts it by bumping the
// submodule. This command does that bump (+ optionally re-syncs the git hooks).
//   - bumps `.harness-engine` to its tracked-branch tip (git submodule --remote)
//   - reports old→new commit + engine version
//   - `--hooks` also rewrites the git pre-commit/pre-push hooks from the new engine
// After running, `git add .harness-engine && git commit` to record the bump.
import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { REPO_ROOT } from "../lib/paths.ts";
import { execShell } from "../lib/exec.ts";
import { info, ok, warn, loudFail } from "../lib/log.ts";
import { readJsonOr } from "../lib/json.ts";

async function submoduleHead(): Promise<string> {
  const r = await execShell("git rev-parse --short HEAD", { cwd: resolve(REPO_ROOT, ".harness-engine") });
  return r.stdout.trim();
}

export async function runUpdate(args: string[]): Promise<number> {
  const eng = resolve(REPO_ROOT, ".harness-engine");
  const hooks = args.includes("--hooks");

  if (!existsSync(resolve(REPO_ROOT, ".gitmodules")) || !existsSync(eng)) {
    info("update: no .harness-engine submodule here.");
    info("  • if the engine IS this repo (self-hosted) → `git pull`.");
    info("  • else add it: `git submodule add -b harness-hardcore https://github.com/dancinlab/harness .harness-engine`");
    return 0;
  }

  const before = existsSync(resolve(eng, ".git")) ? await submoduleHead() : "(uninit)";
  info("update: bumping .harness-engine to its tracked-branch tip…");
  const r = await execShell("git submodule update --init --remote .harness-engine", { cwd: REPO_ROOT });
  if (r.code !== 0) {
    loudFail("update: submodule bump failed");
    process.stderr.write(r.stderr);
    return 1;
  }
  const after = await submoduleHead();
  const ver = readJsonOr<{ version?: string }>(resolve(eng, "package.json"), {}).version ?? "?";

  if (before === after) {
    ok(`update: already current (engine ${ver} @ ${after}).`);
  } else {
    ok(`update: engine ${before} → ${after} (v${ver}).`);
    info("  changes:");
    const log = await execShell(`git log --oneline ${before}..${after} 2>/dev/null | head -10`, { cwd: eng });
    process.stderr.write(log.stdout.split("\n").filter(Boolean).map((l) => `    ${l}`).join("\n") + "\n");
  }

  // refresh git hooks from the (new) engine if requested
  if (hooks) {
    const gitDir = resolve(REPO_ROOT, ".git");
    if (existsSync(gitDir) && statSync(gitDir).isDirectory()) {
      const pc = resolve(gitDir, "hooks", "pre-commit");
      const body = `#!/usr/bin/env bash\n# installed by 'harness init/update' — block commits that fail harness lint gates\nW="$(git rev-parse --show-toplevel)/scripts/harness"\n[ -x "$W" ] || exit 0\nexec bash "$W" lint\n`;
      mkdirSync(dirname(pc), { recursive: true });
      writeFileSync(pc, body, { mode: 0o755 });
      info("  refreshed .git/hooks/pre-commit");
    }
  }

  info("");
  info("next: `git add .harness-engine` + commit to record the engine bump.");
  if (!hooks) info("      (run `harness update --hooks` to also refresh git hooks; agent hooks are GLOBAL-ONLY → `harness install`)");
  return 0;
}
