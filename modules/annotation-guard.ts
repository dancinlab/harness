// annotation-guard — config-declared tool-annotation guard for MCP tool calls.
//
// WHY a config registry instead of live MCP annotations: the Claude Code
// PreToolUse hook payload carries ONLY {tool_name, tool_input, permission_mode,
// cwd, session_id} — it does NOT expose an MCP tool's static annotations
// (readOnlyHint / destructiveHint / idempotentHint / openWorldHint), and there
// is no documented CLI or hook API to query them. Annotations are also HINTS
// from a possibly-untrusted MCP server, so they could lie and can't be the sole
// authority anyway. So sidecar carries its OWN trusted, config-declared
// annotation registry (tool-name patterns → declared hints) and applies a
// Rule-of-Two policy over it — structural permission, the research-backed
// "permission is structural, not prompt text" stance. The registry is data
// (`config/tool-annotations.json`, repo override `.harness/tool-annotations.json`),
// so a new repo can extend it without touching the engine (H4 config-driven).
//
// MCP tools currently have ZERO sidecar guarding (only Bash/Write are guarded),
// so this closes that surface: WARN on a state-mutating MCP call (visibility),
// BLOCK on the destructive+openWorld combo (a single tool that both mutates AND
// reaches the outside world = irreversible external side-effect).
import { readJsonOr } from "../lib/json.ts";
import { config, resolveRuleFile } from "../lib/config.ts";

export type Hint = "readOnly" | "destructive" | "openWorld" | "sensitive" | "idempotent";

const HINT_KEYS: Hint[] = ["readOnly", "destructive", "openWorld", "sensitive", "idempotent"];

interface ToolEntry {
  match: string; // regex tested (case-insensitive) against tool_name
  readOnly?: boolean;
  destructive?: boolean;
  openWorld?: boolean;
  sensitive?: boolean;
  idempotent?: boolean;
  note?: string;
}

interface AnnotationPolicy {
  // each inner array = a hint combo; the verdict fires when ALL hints in the
  // combo are present on the classified tool. `block` wins over `warn`.
  block?: Hint[][];
  warn?: Hint[][];
}

interface AnnotationRegistry {
  policy?: AnnotationPolicy;
  tools?: ToolEntry[];
}

export interface AnnotationVerdict {
  id: string;
  action: "block" | "warn";
  reason: string;
  hints: Hint[];
}

// Used when the registry omits a policy (bundled default carries one, but a repo
// override may drop it). Block the irreversible-external combo, warn on mutation.
const DEFAULT_POLICY: AnnotationPolicy = {
  block: [["destructive", "openWorld"]],
  warn: [["destructive"]],
};

function loadRegistry(): AnnotationRegistry {
  const file = resolveRuleFile(config().annotationGuard.file, "tool-annotations.json");
  return readJsonOr<AnnotationRegistry>(file, {});
}

// OR-merge the declared hints of EVERY registry entry whose regex matches the
// name (explicit exact-name entries and generic name patterns compose). A
// destructive co-match overrides a readOnly one (fail safe).
function classify(toolName: string, reg: AnnotationRegistry): Set<Hint> {
  const hints = new Set<Hint>();
  for (const e of reg.tools ?? []) {
    let re: RegExp;
    try {
      re = new RegExp(e.match, "i");
    } catch {
      continue; // a malformed pattern must not crash the guard
    }
    if (!re.test(toolName)) continue;
    for (const k of HINT_KEYS) if (e[k]) hints.add(k);
  }
  if (hints.has("destructive")) hints.delete("readOnly");
  return hints;
}

function comboMet(combo: Hint[], hints: Set<Hint>): boolean {
  return combo.length > 0 && combo.every((h) => hints.has(h));
}

// Highest-severity verdict (block > warn) for a tool name, or null when the
// tool carries no declared risk hint (unknown tool → allow; never break flows
// on no signal). Registry data drives every decision; this is just the engine.
export function detectAnnotationRisk(toolName: string): AnnotationVerdict | null {
  if (!toolName || !config().annotationGuard.enabled) return null;
  const reg = loadRegistry();
  const policy = reg.policy ?? DEFAULT_POLICY;
  const hints = classify(toolName, reg);
  if (hints.size === 0) return null;
  const hintList = [...hints];
  const fmt = (combo: Hint[]) => combo.join(" + ");

  for (const combo of policy.block ?? []) {
    if (comboMet(combo, hints)) {
      return {
        id: "TOOL-ANNOTATION-BLOCK",
        action: "block",
        hints: hintList,
        reason:
          `MCP tool '${toolName}' is declared ${fmt(combo)} (sidecar tool-annotation registry) — a single tool that BOTH mutates state AND reaches the outside world is the Rule-of-Two danger combo (irreversible external side-effects). ` +
          `If genuinely intended, run it outside the guarded path or relax the policy in \`.harness/tool-annotations.json\`. Declared hints: [${hintList.join(", ")}].`,
      };
    }
  }
  for (const combo of policy.warn ?? []) {
    if (comboMet(combo, hints)) {
      return {
        id: "TOOL-ANNOTATION-WARN",
        action: "warn",
        hints: hintList,
        reason:
          `MCP tool '${toolName}' is declared ${fmt(combo)} (sidecar tool-annotation registry) — a state-mutating MCP call with no other sidecar guard. Confirm it is intended and reversible. Declared hints: [${hintList.join(", ")}].`,
      };
    }
  }
  return null;
}
