// harness recommend {inject|show|set-default|clear-default|get-default|resolve-mode}
// 4-axis recommendation rubric (sidecar recommend-axes parity). `inject` emits
// config/recommend.tape (the SSOT rule carrier) + the active default-mode
// directive as additionalContext. `resolve-mode` is the deterministic mode
// resolver consumed by `harness sbs` (LOCKED precedence in code, not prose).
import { existsSync, readFileSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { HARNESS_CONFIG_DIR, REPO_ROOT } from "../lib/paths.ts";
import { resolveRuleFile } from "../lib/config.ts";
import { readStdin } from "../lib/exec.ts";
import { info } from "../lib/log.ts";

// per-repo standing default mode (one token). sidecar uses ~/.sidecar host-state;
// harness keeps it per-repo under .harness/ (committed = team-shared).
function defaultFile(): string {
  return resolve(REPO_ROOT, ".harness", "recommend-default");
}

function axisLabel(axis: string): string {
  return (
    { complete: "① 완성도(complete)", simple: "② 단순(simple)", safe: "③ 안전(safe)", std: "④ 표준(std)" }[axis] ?? ""
  );
}

function modeLabel(mode: string): string {
  if (mode === "present") return "4축제시 (present · user picks)";
  if (mode === "auto") return "4축합의기준 자동 (auto-pick)";
  const a = axisLabel(mode);
  return a ? `임의 고정 선택 · auto-proceed — ${a}` : "";
}

function readDefault(): string {
  const f = defaultFile();
  if (!existsSync(f)) return "present";
  const v = readFileSync(f, "utf8").trim();
  return v || "present";
}

function defaultDirective(): string {
  const mode = readDefault();
  if (mode === "present") return "";
  if (mode === "auto") {
    return "\n# default mode: AUTO (4축 합의기준 자동) — score the candidate options on ALL four axes (완성도·단순·안전·표준, 1–5, weighted avg 1:1:1:1, tie→안전), auto-pick the consensus winner, render the r2 box THEN one conclusion line `🤖 4축 auto-pick: <안> (완성도=X 단순=Y 안전=Z 표준=W · weighted=<sum>)`; decide for the user, do NOT wait (r4). ALSO governs /sbs when no explicit mode token is given.\n";
  }
  const a = axisLabel(mode);
  if (!a) return "";
  return `\n# default mode: FIXED ${a} (임의 고정 선택 · auto-proceed) — ★-mark this axis line IN PLACE in the r2 box + append \`  ← 기본값\`; STILL render all four lines, THEN AUTO-PROCEED with this axis's champion (decide, do NOT wait) + one conclusion line \`🤖 고정축 auto-pick: <안> (${a} 기준)\` (r4). ALSO governs /sbs with ${a} forced.\n`;
}

function body(): string {
  const tape = resolveRuleFile("recommend.tape", "recommend.tape");
  let text = "";
  try {
    text = readFileSync(tape, "utf8");
  } catch {
    text = "";
  }
  if (!text) text = readFileSync(resolve(HARNESS_CONFIG_DIR, "recommend.tape"), "utf8");
  return "# recommend-axes (MUST FOLLOW — hard rule, not a hint) · SSOT recommend.tape\n" + text + defaultDirective();
}

// ── resolve-mode: deterministic sbs mode resolver (LOCKED precedence) ─────────
const AXES = new Set(["complete", "simple", "safe", "std"]);
function balanced(): string {
  return "complete=1,simple=1,safe=1,std=1";
}
function axisWeights(axis: string): string {
  return AXES.has(axis)
    ? ["complete", "simple", "safe", "std"].map((a) => `${a}=${a === axis ? 1 : 0}`).join(",")
    : balanced();
}

function emitResolution(kind: string, axis: string, src: string, deprecation: boolean): void {
  let human = "";
  let mmode = "manual";
  let maxis = "-";
  let mweights = "-";
  if (kind === "auto-axis") {
    mmode = "auto";
    maxis = axis;
    mweights = axisWeights(axis);
    human = `mode: auto (4-axis: ${axis} forced)`;
  } else if (kind === "auto-balanced") {
    mmode = "auto";
    mweights = balanced();
    human = "mode: auto (4-axis weighted: complete=1, simple=1, safe=1, std=1)";
  } else {
    human = "mode: manual (chat-form · plan.md handoff)";
  }
  if (src === "inherited") human += " ← inherited from recommend-default";
  if (deprecation) process.stdout.write("⚠ legacy-manual is the old per-step pause — use plain manual\n");
  process.stdout.write(human + "\n");
  process.stdout.write(`resolved: mode=${mmode} axis=${maxis} weights=${mweights} source=${src}\n`);
}

export function resolveMode(raw: string): void {
  const tok = raw.trim().split(/\s+/)[0] ?? "";
  const def = readDefault();
  if (tok === "manual") return emitResolution("manual", "-", "explicit", false);
  if (tok === "legacy-manual") return emitResolution("manual", "-", "explicit", true);
  if (tok.startsWith("auto:")) {
    const spec = tok.slice(5);
    if (AXES.has(spec)) return emitResolution("auto-axis", spec, "explicit", false);
    process.stdout.write(`mode: auto (4-axis weighted: ${spec})\n`);
    process.stdout.write(`resolved: mode=auto axis=- weights=${spec} source=explicit\n`);
    return;
  }
  if (tok === "auto") {
    if (AXES.has(def)) return emitResolution("auto-axis", def, "inherited", false);
    if (def === "auto") return emitResolution("auto-balanced", "-", "inherited", false);
    return emitResolution("auto-balanced", "-", "default", false);
  }
  // no mode token → inherit
  if (AXES.has(def)) return emitResolution("auto-axis", def, "inherited", false);
  if (def === "auto") return emitResolution("auto-balanced", "-", "inherited", false);
  return emitResolution("manual", "-", "default", false);
}

export async function runRecommend(args: string[]): Promise<number> {
  const sub = args[0] ?? "show";

  if (sub === "inject") {
    try {
      const j = JSON.parse(readStdin());
      const ev = String(j.hook_event_name ?? j.hookEventName ?? "");
      if (!ev) return 0;
      process.stdout.write(
        JSON.stringify({ hookSpecificOutput: { hookEventName: ev, additionalContext: body() } }) + "\n"
      );
    } catch {
      return 0;
    }
    return 0;
  }
  if (sub === "show") {
    process.stdout.write(body());
    return 0;
  }
  if (sub === "set-default") {
    const mode = (args[1] ?? "").trim();
    if (!modeLabel(mode)) {
      info("usage: harness recommend set-default <present|auto|complete|simple|safe|std>");
      return 1;
    }
    mkdirSync(dirname(defaultFile()), { recursive: true });
    writeFileSync(defaultFile(), mode + "\n", "utf8");
    info(`recommend default mode = ${modeLabel(mode)}`);
    return 0;
  }
  if (sub === "clear-default") {
    if (existsSync(defaultFile())) rmSync(defaultFile());
    info(`recommend default mode = ${modeLabel("present")} (cleared)`);
    return 0;
  }
  if (sub === "get-default") {
    info(`recommend default mode = ${modeLabel(readDefault())}`);
    return 0;
  }
  if (sub === "resolve-mode") {
    resolveMode(args.slice(1).join(" "));
    return 0;
  }
  info("usage: harness recommend {inject|show|set-default|clear-default|get-default|resolve-mode}");
  return 1;
}
