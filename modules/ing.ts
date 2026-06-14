// harness ing [show|add <text>|done <match>|next <text>|pod ...]
// Single-file in-progress tracker at repo-root ING.md — the "now" board:
//   ## 작업 (in-progress) · ## POD (running) · ## 다음 (next)
// Completed work graduates to CHANGELOG.md; final design to ARCHITECTURE.md.
//   ing                    show ING.md
//   ing add <text>         add an in-progress item
//   ing done <match>       flip a matching item to [x]
//   ing next <text>        add a next-up item
//   ing pod add <id> <provider> <gpu> <purpose> [cost]   track a running pod
//   ing pod rm <id>        drop a pod row
//   ing pod list           print the POD table
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO_ROOT } from "../lib/paths.ts";
import { info, ok } from "../lib/log.ts";

function ingPath(): string {
  return resolve(REPO_ROOT, "ING.md");
}
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const TEMPLATE = `# ING — 진행중 (in-progress)

> 📍 SSOT: [ARCHITECTURE.md](ARCHITECTURE.md) · 이력 [CHANGELOG.md](CHANGELOG.md)
> 이 repo 의 **현재 진행중** 작업·POD 단일 추적. 완료 → CHANGELOG, 최종 설계 → ARCHITECTURE.

## 작업 (in-progress)

## POD (running)

| id | provider | gpu | purpose | cost/hr | status | since |
|----|----------|-----|---------|---------|--------|-------|

## 다음 (next)
`;

function read(): string {
  const p = ingPath();
  if (!existsSync(p)) {
    writeFileSync(p, TEMPLATE, "utf8");
    return TEMPLATE;
  }
  return readFileSync(p, "utf8");
}
function write(s: string): void {
  writeFileSync(ingPath(), s, "utf8");
}

// insert a line right after the given "## <section>" header (after its blank line).
function insertUnder(text: string, header: string, line: string): string {
  const lines = text.split("\n");
  const idx = lines.findIndex((l) => l.trim() === header);
  if (idx < 0) return text + `\n${header}\n\n${line}\n`;
  let at = idx + 1;
  if (lines[at] !== undefined && lines[at].trim() === "") at++; // skip one blank
  lines.splice(at, 0, line);
  return lines.join("\n");
}

export async function runIng(args: string[]): Promise<number> {
  const sub = args[0] ?? "show";

  if (sub === "show") {
    process.stdout.write(read());
    return 0;
  }
  if (sub === "add") {
    const t = args.slice(1).join(" ");
    if (!t) return usage();
    write(insertUnder(read(), "## 작업 (in-progress)", `- [ ] ${t} · since ${today()}`));
    ok(`ing: + 작업 — ${t}`);
    return 0;
  }
  if (sub === "next") {
    const t = args.slice(1).join(" ");
    if (!t) return usage();
    write(insertUnder(read(), "## 다음 (next)", `- ${t}`));
    ok(`ing: + 다음 — ${t}`);
    return 0;
  }
  if (sub === "done") {
    const m = args.slice(1).join(" ");
    if (!m) return usage();
    const lines = read().split("\n");
    let hit = false;
    for (let i = 0; i < lines.length; i++) {
      if (!hit && /^- \[ \] /.test(lines[i]) && lines[i].includes(m)) {
        lines[i] = lines[i].replace("- [ ]", "- [x]");
        hit = true;
      }
    }
    write(lines.join("\n"));
    info(hit ? `ing: ✓ done — ${m} (완료분은 CHANGELOG 로 옮기세요)` : `ing: no in-progress item matching "${m}"`);
    return 0;
  }
  if (sub === "pod") return pod(args.slice(1));

  return usage();
}

function pod(args: string[]): number {
  const verb = args[0] ?? "list";
  const text = read();
  const rows = text.split("\n").filter((l) => /^\| /.test(l) && !/^\| id |^\|----/.test(l) && !l.includes("---"));

  if (verb === "list") {
    if (!rows.length) info("ing pod: no running pods.");
    else for (const r of rows) info(`  ${r}`);
    return 0;
  }
  if (verb === "add") {
    const [, id, provider, gpu, ...rest] = args;
    if (!id) {
      info("usage: harness ing pod add <id> <provider> <gpu> <purpose> [cost/hr]");
      return 1;
    }
    const cost = rest.length && /^[\d.$]/.test(rest[rest.length - 1]) ? rest.pop()! : "-";
    const purpose = rest.join(" ") || "-";
    const row = `| ${id} | ${provider ?? "-"} | ${gpu ?? "-"} | ${purpose} | ${cost} | running | ${today()} |`;
    // drop any existing row for this id, then insert right after the table separator
    const lines = text.split("\n").filter((l) => !new RegExp(`^\\|\\s*${id}\\s*\\|`).test(l));
    const sep = lines.findIndex((l) => /^\|-+\|/.test(l.replace(/\s/g, "")) || /^\|----\|/.test(l));
    if (sep >= 0) lines.splice(sep + 1, 0, row);
    else lines.push(row);
    write(lines.join("\n"));
    ok(`ing pod: + ${id} (${gpu ?? "-"} · ${purpose})`);
    return 0;
  }
  if (verb === "rm") {
    const id = args[1];
    if (!id) {
      info("usage: harness ing pod rm <id>");
      return 1;
    }
    const out = text.split("\n").filter((l) => !new RegExp(`^\\|\\s*${id}\\s*\\|`).test(l)).join("\n");
    write(out);
    info(`ing pod: removed ${id}`);
    return 0;
  }
  info("usage: harness ing pod {add <id> <provider> <gpu> <purpose> [cost]|rm <id>|list}");
  return 1;
}

function usage(): number {
  info("usage: harness ing {show|add <text>|done <match>|next <text>|pod {add|rm|list}}");
  return 1;
}
