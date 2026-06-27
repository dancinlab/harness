// sidecar dataset {list|show|add|set|feat|rm}
//
// Dataset registry — the data-side parallel of the model registry. Persisted to
// the repo-root ARCHITECTURE.json top-level `.datasets[]` so design, models and
// datasets all live in ONE single-doc SSOT (no scattered registry file).
//
// The writer is a BYTE-INVARIANT top-level splice: only the `datasets` block is
// rewritten in place; the rest of the file (the design `tree`/`sections`, the
// `models` block, …) is left byte-for-byte identical. A naive JSON.parse →
// JSON.stringify would reformat the whole tree (a huge spurious diff), so we
// locate just the `datasets` value span with string-aware bracket matching and
// replace that span only.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO_ROOT } from "../lib/paths.ts";

const ARCH = resolve(REPO_ROOT, "ARCHITECTURE.json");

export type Dataset = {
  id: string;
  repo_id?: string; // HF repo id, e.g. dancinlab/anima-corpus-ko-general
  lang?: string; // ko | en
  register?: string; // general | sns
  rows?: number | string;
  size?: string;
  visibility?: string; // public | private
  role?: string; // e.g. chat-4cell (a_chat_registers)
  lang_verified?: boolean; // is the "ko"/"en" claim measured, not just intended?
  features?: string[];
  note?: string;
  updated?: string;
  [k: string]: unknown;
};

// Scalar flag → record field. (features handled separately via `feat`/--feat.)
const FIELD_FLAGS: Record<string, keyof Dataset> = {
  "repo_id": "repo_id",
  "repo-id": "repo_id",
  "lang": "lang",
  "register": "register",
  "rows": "rows",
  "size": "size",
  "visibility": "visibility",
  "role": "role",
  "note": "note",
};

function nowIso(): string {
  return new Date().toISOString();
}

function ensureArch(): boolean {
  if (existsSync(ARCH)) return true;
  process.stderr.write(`no ARCHITECTURE.json at repo root (${REPO_ROOT}) — datasets live in the design SSOT\n`);
  return false;
}

function readDatasets(): Dataset[] {
  try {
    const root = JSON.parse(readFileSync(ARCH, "utf8")) as { datasets?: Dataset[] };
    return Array.isArray(root.datasets) ? root.datasets : [];
  } catch {
    return [];
  }
}

// Render a value the way JSON.stringify(_, null, 2) would render it as the VALUE
// of a top-level (nesting-level-1) key: the literal is indented from column 0,
// so every line after the first gains +2 spaces, and the `  "<key>": ` prefix
// goes on the first line.
function renderTopLevel(key: string, value: unknown): string {
  const body = JSON.stringify(value, null, 2);
  const indented = body
    .split("\n")
    .map((l, i) => (i === 0 ? l : "  " + l))
    .join("\n");
  return `  "${key}": ${indented}`;
}

// String-aware container end: given valStart at an opening `[`/`{`, return the
// index just past the matching close, ignoring brackets inside JSON strings.
function matchValueEnd(text: string, valStart: number): number {
  const open = text[valStart];
  const close = open === "[" ? "]" : open === "{" ? "}" : "";
  if (!close) throw new Error("datasets value is not a JSON container");
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = valStart; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  throw new Error("unterminated datasets block");
}

// Find a top-level key block (exactly 2-space indent). Returns the value span
// [lineStart, valEnd) and the byte just past the value, or null if absent.
function topLevelSpan(text: string, key: string): { lineStart: number; valEnd: number } | null {
  const re = new RegExp(`\\n {2}"${key}" *:`);
  const m = text.match(re);
  if (!m || m.index === undefined) return null;
  const lineStart = m.index + 1; // skip the matched leading \n
  const colon = text.indexOf(":", lineStart);
  let v = colon + 1;
  while (v < text.length && (text[v] === " " || text[v] === "\t")) v++;
  const valEnd = matchValueEnd(text, v);
  return { lineStart, valEnd };
}

function writeDatasets(datasets: Dataset[]): void {
  const text = readFileSync(ARCH, "utf8");
  const block = renderTopLevel("datasets", datasets);

  // (1) replace an existing `datasets` block in place (trailing comma, if any,
  //     stays untouched after valEnd).
  const here = topLevelSpan(text, "datasets");
  if (here) {
    const next = text.slice(0, here.lineStart) + block + text.slice(here.valEnd);
    writeFileSync(ARCH, next, "utf8");
    return;
  }

  // (2) insert directly after the `models` block (so the two registries sit
  //     adjacent), preserving models' trailing comma.
  const models = topLevelSpan(text, "models");
  if (models) {
    let at = models.valEnd;
    if (text[at] === ",") at++; // keep models' comma before our block
    const next = text.slice(0, at) + "\n" + block + "," + text.slice(at);
    writeFileSync(ARCH, next, "utf8");
    return;
  }

  // (3) fallback: first key after the opening brace.
  const brace = text.indexOf("{");
  const next = text.slice(0, brace + 1) + "\n" + block + "," + text.slice(brace + 1);
  writeFileSync(ARCH, next, "utf8");
}

// --key value / --key=value parser. Returns scalar fields + special opts.
function parseFlags(args: string[]): {
  fields: Partial<Dataset>;
  feats?: string[];
  langVerified?: boolean;
  filters: { lang?: string; register?: string };
} {
  const fields: Partial<Dataset> = {};
  const filters: { lang?: string; register?: string } = {};
  let feats: string[] | undefined;
  let langVerified: boolean | undefined;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith("--")) continue;
    let name = a.slice(2);
    let val: string | undefined;
    const eq = name.indexOf("=");
    if (eq >= 0) {
      val = name.slice(eq + 1);
      name = name.slice(0, eq);
    } else if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
      val = args[++i];
    }
    if (name === "feat") {
      feats = (val ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    } else if (name === "lang-verified" || name === "lang_verified") {
      langVerified = val === undefined ? true : val === "true" || val === "yes" || val === "1";
    } else if (name === "rows") {
      const n = Number(val);
      fields.rows = val !== undefined && !Number.isNaN(n) && val.trim() !== "" ? n : val;
    } else if (FIELD_FLAGS[name]) {
      // list filters reuse the same flag names but only bite in `list`.
      if (name === "lang") filters.lang = val;
      if (name === "register") filters.register = val;
      (fields as Record<string, unknown>)[FIELD_FLAGS[name]] = val;
    }
  }
  return { fields, feats, langVerified, filters };
}

function fmtCell(d: Dataset): string {
  const rows = d.rows === undefined ? "?" : String(d.rows);
  const vis = d.visibility ?? "?";
  const lv = d.lang_verified === true ? "✓lang" : d.lang_verified === false ? "✗lang" : "";
  const bits = [d.size, `${rows} rows`, vis, lv].filter(Boolean).join(" · ");
  return `${d.id}  (${bits})`;
}

function cmdList(args: string[]): number {
  const { filters } = parseFlags(args);
  let ds = readDatasets();
  if (filters.lang) ds = ds.filter((d) => d.lang === filters.lang);
  if (filters.register) ds = ds.filter((d) => d.register === filters.register);
  if (ds.length === 0) {
    process.stdout.write("(no datasets registered)\n");
    return 0;
  }
  // flat list
  for (const d of ds) process.stdout.write(`  ${fmtCell(d)}\n`);
  // 4-cell lang × register grid (only when not filtered to a single axis)
  if (!filters.lang && !filters.register) {
    const langs = ["ko", "en"];
    const regs = ["general", "sns"];
    process.stdout.write("\n  4-cell (lang × register):\n");
    for (const lang of langs) {
      for (const reg of regs) {
        const hit = ds.find((d) => d.lang === lang && d.register === reg);
        const mark = hit ? "🟢" : "⚪";
        const detail = hit ? `${hit.id} · ${hit.rows ?? "?"} rows` : "(empty)";
        process.stdout.write(`    ${mark} ${lang}/${reg}: ${detail}\n`);
      }
    }
  }
  return 0;
}

function cmdShow(args: string[]): number {
  const id = args.find((a) => !a.startsWith("--"));
  if (!id) {
    process.stderr.write("usage: sidecar dataset show <id>\n");
    return 1;
  }
  const d = readDatasets().find((x) => x.id === id);
  if (!d) {
    process.stderr.write(`no dataset '${id}'\n`);
    return 1;
  }
  process.stdout.write(JSON.stringify(d, null, 2) + "\n");
  return 0;
}

function applyFields(d: Dataset, p: ReturnType<typeof parseFlags>): void {
  for (const [k, v] of Object.entries(p.fields)) {
    if (v !== undefined) (d as Record<string, unknown>)[k] = v;
  }
  if (p.langVerified !== undefined) d.lang_verified = p.langVerified;
  if (p.feats) d.features = p.feats;
  d.updated = nowIso();
}

function cmdAdd(args: string[]): number {
  const id = args.find((a) => !a.startsWith("--"));
  if (!id) {
    process.stderr.write("usage: sidecar dataset add <id> [--repo_id ..] [--lang ko|en] [--register general|sns] [--rows N] [--size ..] [--visibility ..] [--role ..] [--lang-verified true|false] [--feat a,b] [--note ..]\n");
    return 1;
  }
  const datasets = readDatasets();
  if (datasets.some((d) => d.id === id)) {
    process.stderr.write(`dataset '${id}' already exists — use 'set' to update\n`);
    return 1;
  }
  const d: Dataset = { id };
  applyFields(d, parseFlags(args));
  datasets.push(d);
  writeDatasets(datasets);
  process.stdout.write(`added dataset '${id}'\n`);
  return 0;
}

function cmdSet(args: string[]): number {
  const id = args.find((a) => !a.startsWith("--"));
  if (!id) {
    process.stderr.write("usage: sidecar dataset set <id> [--field value ...]\n");
    return 1;
  }
  const datasets = readDatasets();
  const d = datasets.find((x) => x.id === id);
  if (!d) {
    process.stderr.write(`no dataset '${id}' — use 'add' to create\n`);
    return 1;
  }
  applyFields(d, parseFlags(args));
  writeDatasets(datasets);
  process.stdout.write(`updated dataset '${id}'\n`);
  return 0;
}

function cmdFeat(args: string[]): number {
  const pos = args.filter((a) => !a.startsWith("--"));
  const [id, op, tag] = pos;
  if (!id || (op !== "add" && op !== "rm") || !tag) {
    process.stderr.write("usage: sidecar dataset feat <id> <add|rm> <tag>\n");
    return 1;
  }
  const datasets = readDatasets();
  const d = datasets.find((x) => x.id === id);
  if (!d) {
    process.stderr.write(`no dataset '${id}'\n`);
    return 1;
  }
  const feats = new Set(d.features ?? []);
  if (op === "add") feats.add(tag);
  else feats.delete(tag);
  d.features = [...feats];
  d.updated = nowIso();
  writeDatasets(datasets);
  process.stdout.write(`${op === "add" ? "added" : "removed"} feature '${tag}' on '${id}'\n`);
  return 0;
}

function cmdRm(args: string[]): number {
  const id = args.find((a) => !a.startsWith("--"));
  if (!id) {
    process.stderr.write("usage: sidecar dataset rm <id>\n");
    return 1;
  }
  const datasets = readDatasets();
  const idx = datasets.findIndex((x) => x.id === id);
  if (idx < 0) {
    process.stderr.write(`no dataset '${id}' — nothing removed\n`);
    return 1;
  }
  const [removed] = datasets.splice(idx, 1);
  writeDatasets(datasets);
  process.stdout.write(`removed dataset '${removed.id}'\n`);
  return 0;
}

const HELP = `sidecar dataset — dataset registry (ARCHITECTURE.json .datasets[])

usage:
  dataset list [--lang ko|en] [--register general|sns]   list datasets + 4-cell grid
  dataset show <id>                                       print one record (JSON)
  dataset add <id> [flags]                                create (errors if exists)
  dataset set <id> [flags]                                update existing fields
  dataset feat <id> <add|rm> <tag>                        manage features[]
  dataset rm <id>                                         remove (errors if absent)

flags: --repo_id <hf> --lang ko|en --register general|sns --rows N --size <s>
       --visibility public|private --role <r> --lang-verified true|false
       --feat a,b,c --note <text>
`;

export async function runDataset(args: string[]): Promise<number> {
  const [sub, ...rest] = args;
  if (!sub || sub === "-h" || sub === "--help" || sub === "help") {
    process.stdout.write(HELP);
    return 0;
  }
  if (!ensureArch()) return 1;
  switch (sub) {
    case "list":
    case "ls":
      return cmdList(rest);
    case "show":
      return cmdShow(rest);
    case "add":
      return cmdAdd(rest);
    case "set":
      return cmdSet(rest);
    case "feat":
      return cmdFeat(rest);
    case "rm":
    case "remove":
      return cmdRm(rest);
    default:
      process.stderr.write(`unknown dataset subcommand: ${sub}\n\n${HELP}`);
      return 1;
  }
}
