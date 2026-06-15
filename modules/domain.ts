// harness domain — long-horizon goal/milestone tracker (sidecar parity).
//   <NAME>.md   snapshot: @title:(optional) · @goal: · `- [ ]`/`- [x]` milestones
//   <NAME>.tape append-only step log
//   DOMAINS.tape roster: `@domain NAME := "./path.md"` (NAME→path, authoritative)
//   .harness/domain-active  repo-local active pointer (one NAME; not committed)
// Verbs: init · set|<NAME> · list|ls [--sync] · goal · ms|milestone · title ·
//        done <match> · todo|new|<task> (log) · absorb <file> [--state] · bare(show)
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, relative, dirname, basename } from "node:path";
import { REPO_ROOT } from "../lib/paths.ts";
import { info, ok, warn, loudFail } from "../lib/log.ts";

const ROSTER = resolve(REPO_ROOT, "DOMAINS.tape");
const ACTIVE = resolve(REPO_ROOT, ".harness", "domain-active");

// NAME = UPPERCASE/digit start, then UPPERCASE/digit/`-`/`+`. `_` rejected.
function isName(s: string): boolean {
  return /^[A-Z0-9][A-Z0-9+-]*$/.test(s);
}
function read(p: string): string {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return "";
  }
}

interface RosterRow {
  name: string;
  path: string;
}
function roster(): RosterRow[] {
  const out: RosterRow[] = [];
  for (const line of read(ROSTER).split("\n")) {
    const m = line.match(/^@domain\s+(\S+)\s*:=\s*"(.+)"\s*$/);
    if (m) out.push({ name: m[1], path: m[2] });
  }
  return out;
}
function writeRoster(rows: RosterRow[]): void {
  const body = [
    "# DOMAINS.tape — domain roster (NAME → snapshot path; progress/goal stay derived, not stored here)",
    '@V := "domains" :: index',
    "",
    ...rows.map((r) => `@domain ${r.name} := "${r.path}"`),
    "",
  ].join("\n");
  writeFileSync(ROSTER, body);
}
function rosterPath(name: string): string | null {
  return roster().find((r) => r.name === name)?.path ?? null;
}

// snapshot path → absolute. Defaults to repo-root <NAME>.md when not in roster.
function mdAbs(name: string): string {
  const rp = rosterPath(name);
  return rp ? resolve(REPO_ROOT, rp) : resolve(REPO_ROOT, `${name}.md`);
}
function tapeAbs(name: string): string {
  return mdAbs(name).replace(/\.md$/, ".tape");
}

function getActive(): string | null {
  const v = read(ACTIVE).trim();
  return v && isName(v) ? v : null;
}
function setActive(name: string): void {
  mkdirSync(dirname(ACTIVE), { recursive: true });
  writeFileSync(ACTIVE, name + "\n");
}

function nowStamp(): string {
  // Date.* is fine here (runtime CLI, not a workflow script).
  return new Date().toISOString().replace("T", " ").slice(0, 16);
}

interface Snapshot {
  title: string | null;
  goal: string | null;
  done: number;
  total: number;
}
function parseSnapshot(name: string): Snapshot {
  const t = read(mdAbs(name));
  const title = t.match(/^@title:\s*(.+)$/m)?.[1]?.trim() ?? null;
  const goal = t.match(/^@goal:\s*(.+)$/m)?.[1]?.trim() ?? null;
  const checks = [...t.matchAll(/^- \[([ xX])\]/gm)];
  const done = checks.filter((c) => c[1].toLowerCase() === "x").length;
  return { title, goal, done, total: checks.length };
}
function bar(done: number, total: number): string {
  if (!total) return "░░░░░ 0% · 0/0";
  const pct = Math.round((done / total) * 100);
  const filled = Math.round((done / total) * 5);
  return "▓".repeat(filled) + "░".repeat(5 - filled) + ` ${pct}% · ${done}/${total}`;
}

function scaffold(name: string, dir: string): { md: string; tape: string } {
  const md = resolve(REPO_ROOT, dir, `${name}.md`);
  const tape = resolve(REPO_ROOT, dir, `${name}.tape`);
  mkdirSync(dirname(md), { recursive: true });
  if (!existsSync(md)) {
    writeFileSync(
      md,
      `# ${name}\n\n@goal: (declare the final goal — \`harness domain goal <text>\`)\n\n## milestones\n- [ ] (first milestone — \`harness domain ms <text>\`)\n`,
    );
  }
  if (!existsSync(tape)) {
    writeFileSync(tape, `# ${name}.tape — append-only step log\n@V := "${name}" :: log\n\n`);
  }
  return { md, tape };
}

function appendLog(name: string, line: string): void {
  const p = tapeAbs(name);
  if (!existsSync(p)) writeFileSync(p, `# ${name}.tape — append-only step log\n@V := "${name}" :: log\n\n`);
  writeFileSync(p, read(p).replace(/\n*$/, "\n") + `- ${nowStamp()} ${line}\n`);
}

function requireActive(): string | null {
  const a = getActive();
  if (!a) {
    loudFail("domain: no active domain — `harness domain set <NAME>` or `harness domain init <NAME>`");
    return null;
  }
  return a;
}

function showActive(): number {
  const a = getActive();
  if (!a) {
    info("domain: none active. `harness domain init <NAME>` or `set <NAME>` · `list` to see all.");
    return 0;
  }
  const s = parseSnapshot(a);
  info(`◆ ${s.title ?? a}${s.title ? `  (${a})` : ""}`);
  info(`  @goal: ${s.goal ?? "(none — lint: set with `domain goal <text>`)"}`);
  info(`  진행: ${bar(s.done, s.total)}`);
  if (!s.goal) warn("  lint: @goal missing");
  if (!s.total) warn("  lint: no milestones (`domain ms <text>`)");
  return 0;
}

export async function runDomain(args: string[]): Promise<number> {
  const sub = args[0];

  if (!sub || sub === "show") return showActive();

  if (sub === "list" || sub === "ls") {
    const sync = args.includes("--sync");
    let rows = roster();
    if (sync) {
      // reconcile: add any repo-root <NAME>.md with @goal not yet in roster
      const have = new Set(rows.map((r) => r.name));
      for (const f of readdirSync(REPO_ROOT)) {
        const m = f.match(/^([A-Z0-9][A-Z0-9+-]*)\.md$/);
        if (m && !have.has(m[1]) && /@goal:/.test(read(resolve(REPO_ROOT, f)))) {
          rows.push({ name: m[1], path: `./${f}` });
        }
      }
      rows.sort((a, b) => a.name.localeCompare(b.name));
      writeRoster(rows);
      ok(`domain list --sync: roster reconciled (${rows.length} domain(s))`);
    }
    if (!rows.length) {
      info("domain: roster empty — `harness domain init <NAME>`");
      return 0;
    }
    const active = getActive();
    info(`domains (${rows.length}):`);
    for (const r of rows) {
      const s = parseSnapshot(r.name);
      const star = r.name === active ? "★" : " ";
      info(`  ${star} ${r.name}  [${bar(s.done, s.total)}]  ${s.goal ?? "(no @goal)"}  · ${r.path}`);
    }
    return 0;
  }

  if (sub === "init") {
    const name = args[1];
    const dir = args[2] ?? ".";
    if (!name || !isName(name)) {
      loudFail("domain init <NAME> [dir] — NAME = UPPERCASE/digit start, [A-Z0-9+-]+ (no `_`)");
      return 2;
    }
    const { md, tape } = scaffold(name, dir);
    const rows = roster();
    const relMd = "./" + relative(REPO_ROOT, md);
    if (!rows.some((r) => r.name === name)) {
      rows.push({ name, path: relMd });
      writeRoster(rows);
    }
    setActive(name);
    ok(`domain init: ${name} → ${relMd} (+ ${basename(tape)}), roster updated, now active.`);
    info("  declare goal: `harness domain goal <text>` · add milestone: `harness domain ms <text>`");
    return 0;
  }

  if (sub === "set") {
    const name = args[1];
    if (!name || !isName(name)) {
      loudFail("domain set <NAME>");
      return 2;
    }
    if (!rosterPath(name) && !existsSync(mdAbs(name))) {
      warn(`domain set: ${name} not in roster and no ${name}.md — \`init\` it first?`);
    }
    setActive(name);
    ok(`domain: active = ${name}`);
    return showActive();
  }

  if (sub === "goal") {
    const a = requireActive();
    if (!a) return 1;
    const text = args.slice(1).join(" ").trim();
    if (!text) {
      loudFail("domain goal <text>");
      return 2;
    }
    const p = mdAbs(a);
    let t = read(p);
    if (/^@goal:.*$/m.test(t)) t = t.replace(/^@goal:.*$/m, `@goal: ${text}`);
    else t = t.replace(/^(#[^\n]*\n)/, `$1\n@goal: ${text}\n`);
    writeFileSync(p, t);
    ok(`domain ${a}: @goal set.`);
    return 0;
  }

  if (sub === "title" || sub === "subtitle") {
    const a = requireActive();
    if (!a) return 1;
    const text = args.slice(1).join(" ").trim();
    if (!text) {
      loudFail("domain title <text>");
      return 2;
    }
    const p = mdAbs(a);
    let t = read(p);
    if (/^@title:.*$/m.test(t)) t = t.replace(/^@title:.*$/m, `@title: ${text}`);
    else t = t.replace(/^(#[^\n]*\n)/, `$1@title: ${text}\n`);
    writeFileSync(p, t);
    ok(`domain ${a}: @title set.`);
    return 0;
  }

  if (sub === "ms" || sub === "milestone") {
    const a = requireActive();
    if (!a) return 1;
    const text = args.slice(1).join(" ").trim();
    if (!text) {
      loudFail("domain ms <text>");
      return 2;
    }
    const p = mdAbs(a);
    let t = read(p);
    if (/^## milestones\s*$/m.test(t)) t = t.replace(/^(## milestones\s*\n)/m, `$1- [ ] ${text}\n`);
    else t = t.replace(/\n*$/, "\n") + `\n## milestones\n- [ ] ${text}\n`;
    writeFileSync(p, t);
    ok(`domain ${a}: + milestone.`);
    return 0;
  }

  if (sub === "done") {
    const a = requireActive();
    if (!a) return 1;
    const match = args.slice(1).join(" ").trim();
    if (!match) {
      loudFail("domain done <match>");
      return 2;
    }
    const p = mdAbs(a);
    const lines = read(p).split("\n");
    let hit = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^- \[ \]/.test(lines[i]) && lines[i].toLowerCase().includes(match.toLowerCase())) {
        hit = i;
        break;
      }
    }
    if (hit >= 0) {
      lines[hit] = lines[hit].replace(/^- \[ \]/, "- [x]");
      writeFileSync(p, lines.join("\n"));
      const s = parseSnapshot(a);
      ok(`domain ${a}: ✓ milestone done — ${bar(s.done, s.total)}`);
    } else {
      appendLog(a, `done: ${match}`);
      ok(`domain ${a}: no matching open milestone — logged to ${basename(tapeAbs(a))} instead.`);
    }
    return 0;
  }

  if (sub === "absorb") {
    const a = requireActive();
    if (!a) return 1;
    const file = args[1];
    const toState = args.includes("--state");
    if (!file) {
      loudFail("domain absorb <file> [--state]");
      return 2;
    }
    const src = resolve(REPO_ROOT, file);
    if (!existsSync(src)) {
      loudFail(`domain absorb: ${file} not found`);
      return 1;
    }
    const content = read(src);
    const target = toState ? mdAbs(a) : tapeAbs(a);
    const header = `\n<!-- absorbed from ${file} @ ${nowStamp()} -->\n`;
    writeFileSync(target, read(target).replace(/\n*$/, "\n") + header + content.replace(/\n*$/, "\n"));
    writeFileSync(src, `> 📍 합산보관: 이 내용은 \`${relative(REPO_ROOT, target)}\` 로 흡수됨 (domain ${a}).\n`);
    ok(`domain ${a}: absorbed ${file} → ${basename(target)} (source replaced with pointer).`);
    return 0;
  }

  // todo | new | <bare task> → append to log
  if (sub === "todo" || sub === "new") {
    const a = requireActive();
    if (!a) return 1;
    const text = args.slice(1).join(" ").trim();
    if (!text) {
      loudFail(`domain ${sub} <text>`);
      return 2;
    }
    appendLog(a, sub === "new" ? `## ${text}` : `todo: ${text}`);
    ok(`domain ${a}: logged.`);
    return 0;
  }

  // bare token: if it's a valid NAME, treat as `set`; else log it as a task.
  if (isName(sub)) {
    return runDomain(["set", sub]);
  }
  const a = requireActive();
  if (!a) return 1;
  appendLog(a, args.join(" ").trim());
  ok(`domain ${a}: logged.`);
  return 0;
}
