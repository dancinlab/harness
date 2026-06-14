// harness pr-cycle [extra gh flags]
// One-shot PR cycle (sidecar pr-cycle parity): push current branch → open PR →
// self-merge (squash · admin · delete-branch). Refuses on main/master. Extra
// args are passed through to `gh pr create` (e.g. --title "…" --body "…").
import { execShell } from "../lib/exec.ts";
import { info, ok, loudFail } from "../lib/log.ts";
import { repoPath } from "../lib/config.ts";

async function git(cmd: string): Promise<{ code: number; out: string }> {
  const r = await execShell(cmd, { cwd: repoPath(".") });
  return { code: r.code, out: (r.stdout + r.stderr).trim() };
}

export async function runPrCycle(args: string[]): Promise<number> {
  const branch = (await git("git symbolic-ref --short -q HEAD || git rev-parse --abbrev-ref HEAD")).out;
  if (!branch || branch === "main" || branch === "master") {
    loudFail(`pr-cycle: refuses on '${branch || "?"}' — switch to a feature branch first.`);
    return 1;
  }
  info(`pr-cycle: branch '${branch}'`);

  // 1. push
  const push = await git(`git push --no-verify -u origin ${JSON.stringify(branch)}`);
  if (push.code !== 0) {
    loudFail("pr-cycle: push failed");
    info(push.out);
    return 1;
  }
  info("  ✓ pushed");

  // 2. open PR (--fill + any extra flags). If one already exists, continue.
  const extra = args.map((a) => JSON.stringify(a)).join(" ");
  const create = await git(`gh pr create --fill ${extra}`.trim());
  if (create.code !== 0 && !/already exists/i.test(create.out)) {
    loudFail("pr-cycle: gh pr create failed");
    info(create.out);
    return 1;
  }
  info(`  ✓ PR ready ${(create.out.match(/https:\/\/\S+/) || [""])[0]}`);

  // 3. self-merge
  const merge = await git(`gh pr merge ${JSON.stringify(branch)} --squash --admin --delete-branch`);
  if (merge.code !== 0) {
    loudFail("pr-cycle: merge failed (need admin? checks pending?)");
    info(merge.out);
    return 1;
  }
  ok(`pr-cycle: merged '${branch}' (squash · branch deleted).`);

  // 4. light worktree sweep — prune any linked worktree whose upstream is gone
  await git("git worktree prune");
  return 0;
}
