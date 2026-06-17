// handoff-guard — block scattered hand-off markdown on Write/Edit. Cross-session
// / cross-repo hand-offs route through the repo-root ING.jsonl board
// (`harness ing add [--to <repo>]`), NEVER ad-hoc HANDOFF.md / INBOX.md or
// inbox/*.md scatter. Returns a deny reason, or null when the path is fine.
//
//   (a) file_path contains `/inbox/` at ANY depth AND ends in `.md`
//       (the retired inbox-markdown scatter — inbox/patches/*.md, deep nests),
//   (b) basename is HANDOFF.md or INBOX.md.
// The `.md`-scope on the inbox match is the deliberate false-positive guard: a
// legit app's inbox/queue.json / inbox/handler.py is NOT blocked.
import { basename } from "node:path";

export function detectHandoffScatter(filePath: string): string | null {
  const base = basename(filePath);
  if (base === "HANDOFF.md" || base === "INBOX.md") {
    return `${base} is retired hand-off scatter — record it on the repo-root ING.jsonl instead: \`harness ing add <text>\` (cross-repo: \`--to <repo>\`).`;
  }
  if (/(^|\/)inbox\//.test(filePath) && filePath.endsWith(".md")) {
    return `inbox/*.md is the retired cross-repo scatter pattern — route it through ING.jsonl: \`harness ing add <text> --to <repo>\` (lands on the target repo's board, committed).`;
  }
  return null;
}
