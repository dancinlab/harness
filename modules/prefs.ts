// sidecar prefs {show|code <lang>|docs <lang>|response <lang>|inject}
// Language preferences on 3 axes:
//   code authoring · doc authoring · response-to-user.
// Stored per-repo at .harness/prefs.json. `inject` emits a UserPromptSubmit
// additionalContext block so the agent is reminded every turn; the
// post-edit guard additionally flags code that violates the code-authoring axis.
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { emitInject } from "../lib/inject.ts";
import { resolve, dirname } from "node:path";
import { REPO_ROOT } from "../lib/paths.ts";
import { readJsonOr, writeJson } from "../lib/json.ts";
import { info, warn } from "../lib/log.ts";
import { readStdin, execShell } from "../lib/exec.ts";

export interface Prefs {
  code: string;
  docs: string;
  response: string;
}

const DEFAULTS: Prefs = { code: "english", docs: "english", response: "korean" };

function prefsFile(): string {
  return resolve(REPO_ROOT, ".harness", "prefs.json");
}

export function loadPrefs(): Prefs {
  return { ...DEFAULTS, ...readJsonOr<Partial<Prefs>>(prefsFile(), {}) };
}

function body(p: Prefs): string {
  return (
    "# prefs (MUST FOLLOW every reply — hard rules, not hints)\n" +
    `- code authoring (.ts · .py · .rs · .go · .c · .swift · ...): ${p.code}\n` +
    `- doc authoring (.md · README · CHANGELOG · ...): ${p.docs}\n` +
    `- response to user: ${p.response} — EVERY user-visible token (headers · table cells · prose · inline notes · summaries). Switch ONLY on explicit user request. If you catch yourself drifting to another language mid-reply, restart that section in ${p.response}.\n`
  );
}

const HANGUL = /[가-힣]/;

// Used by the post-edit guard: a code file written in a non-Korean
// code-authoring repo that contains Hangul is almost always a stray comment /
// string that should be English (or moved to a locale file).
export function codeLangViolation(file: string, content: string): string | null {
  const p = loadPrefs();
  if (p.code !== "english") return null;
  if (!/\.(ts|tsx|js|jsx|mjs|cjs|py|rb|php|go|rs|java|kt|kts|scala|c|h|cpp|cc|cxx|hpp|m|mm|swift|dart|hexa)$/.test(file)) return null;
  if (content.includes("@lang-ok")) return null;
  if (!HANGUL.test(content)) return null;
  return `code authoring pref is '${p.code}' but Hangul found in ${file} — keep code/comments English (move UI text to locale files), or add // @lang-ok`;
}

const DOC_EXT = /(\.(md|markdown|mdx|rst)$)|((^|\/)(README|CHANGELOG|CONTRIBUTING)(\.[a-z]+)?$)/i;

// Minimal last-assistant-text reader (inlined to avoid a circular import with recommend.ts,
// which imports loadPrefs). Returns the newest assistant message's plain text, or "".
function lastAssistant(tp: string): string {
  let raw = "";
  try {
    raw = readFileSync(tp, "utf8");
  } catch {
    return "";
  }
  const lines = raw.split("\n").filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const j = JSON.parse(lines[i]) as { type?: string; message?: { role?: string; content?: unknown }; content?: unknown };
      if (j.type !== "assistant" && j.message?.role !== "assistant") continue;
      const content = j.message?.content ?? j.content;
      if (Array.isArray(content)) {
        const txt = content.filter((c) => (c as { type?: string })?.type === "text").map((c) => (c as { text?: string }).text ?? "").join("\n");
        if (txt.trim()) return txt;
      } else if (typeof content === "string" && content.trim()) {
        return content;
      }
    } catch {
      /* non-JSON line — skip */
    }
  }
  return "";
}

// Stop-hook WARN gate (NEVER blocks) — enforces the prefs language axes at turn close that the
// per-edit guards can't: the DOCS axis (a doc file authored this turn in the wrong language) and
// the RESPONSE axis (the reply prose drifted from the response language). The CODE axis is
// already covered per-edit by codeLangViolation (post.ts · PostToolUse), so it is NOT re-checked
// here (avoids double-nag + string-literal noise). Advisory only — prefs stays a soft rule; the
// only HARD language gate is on the re-injected governance docs (INJECT-NON-ENGLISH).
async function prefsStopCheck(): Promise<number> {
  let payload: { stop_hook_active?: boolean; transcript_path?: string; transcriptPath?: string };
  try {
    payload = JSON.parse(readStdin());
  } catch {
    return 0;
  }
  if (payload?.stop_hook_active) return 0; // anti-wedge — one nudge per Stop chain
  const p = loadPrefs();
  const warns: string[] = [];

  // 1) DOCS axis — working-tree diff for doc files with Korean prose added this turn.
  if (p.docs === "english") {
    let diff = "";
    try {
      diff = (await execShell("git diff --no-color; git diff --cached --no-color", { cwd: REPO_ROOT })).stdout;
    } catch {
      diff = "";
    }
    const docHits = new Set<string>();
    let file = "";
    for (const line of diff.split("\n")) {
      if (line.startsWith("+++ b/")) { file = line.slice(6); continue; }
      if (line.startsWith("+++")) { file = ""; continue; }
      if (!file || !line.startsWith("+") || !DOC_EXT.test(file)) continue; // only ADDED doc lines
      const added = line.slice(1).replace(/`[^`]*`/g, ""); // code-spans exempt
      if (HANGUL.test(added)) docHits.add(file);
    }
    for (const f of docHits) warns.push(`docs=${p.docs} 인데 ${f} 에 한글 산문 추가 — 문서는 ${p.docs} 로 (백틱 코드스팬은 예외)`);
  }

  // 2) response drift — output prose (no file to lint), so a heuristic WARN for the korean
  //    case: if the response prose (code stripped) is almost entirely non-Hangul.
  if (p.response.toLowerCase().startsWith("ko")) {
    const tp = payload?.transcript_path ?? payload?.transcriptPath;
    if (tp) {
      const prose = lastAssistant(String(tp)).replace(/```[\s\S]*?```/g, "").replace(/`[^`]*`/g, "");
      const letters = (prose.match(/[A-Za-z가-힣]/g) ?? []).length;
      const hangul = (prose.match(/[가-힣]/g) ?? []).length;
      if (letters > 200 && hangul / letters < 0.1) {
        warns.push(`response=${p.response} 인데 이번 응답 산문이 거의 ${p.response} 아님 (Hangul ${Math.round((hangul / letters) * 100)}%) — 사용자 대면 토큰은 ${p.response} 로`);
      }
    }
  }

  if (warns.length) {
    warn(`[prefs-drift] 이번 턴 prefs 언어축 이탈 ${warns.length}건 (warn · 차단 아님):\n  - ${warns.join("\n  - ")}`);
  }
  return 0;
}

function eventName(): string {
  // inject reads the firing hook event from stdin JSON and echoes it back.
  try {
    const j = JSON.parse(readStdin());
    return String(j.hook_event_name ?? j.hookEventName ?? "UserPromptSubmit");
  } catch {
    return "UserPromptSubmit";
  }
}

export async function runPrefs(args: string[]): Promise<number> {
  const sub = args[0] ?? "show";
  if (sub === "stop-check") return prefsStopCheck();
  const p = loadPrefs();

  if (sub === "inject") {
    const ev = eventName();
    emitInject("prefs", ev, body(p));
    return 0;
  }
  if (sub === "show") {
    info(`prefs (${existsSync(prefsFile()) ? ".harness/prefs.json" : "defaults"}):`);
    info(`  code     = ${p.code}`);
    info(`  docs     = ${p.docs}`);
    info(`  response = ${p.response}`);
    return 0;
  }
  if (sub === "code" || sub === "docs" || sub === "response") {
    const lang = args[1];
    if (!lang) {
      info(`usage: sidecar prefs ${sub} <lang>`);
      return 1;
    }
    const next: Prefs = { ...p, [sub]: lang };
    mkdirSync(dirname(prefsFile()), { recursive: true });
    writeJson(prefsFile(), next);
    info(`prefs.${sub} = ${lang}`);
    return 0;
  }
  info("usage: sidecar prefs {show|code <lang>|docs <lang>|response <lang>|inject|stop-check}");
  return 1;
}
