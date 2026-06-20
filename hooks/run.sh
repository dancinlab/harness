#!/usr/bin/env bash
# harness plugin hook dispatcher — single resolution point for the harness CLI.
#
# Self-contained-first: prefer the plugin's OWN bundled CLI (${CLAUDE_PLUGIN_ROOT}/bin/harness),
# so a `/plugin update` + reload refreshes the CLI together with hooks/commands — no separate
# `harness self-update`. Falls back to a global `harness` on PATH (the classic ~/.harness/cli
# install), and stays silent (exit 0) if neither exists, so a host without harness never errors.
#
# CC pipes the hook payload on this process's STDIN; we exec the CLI so it inherits that STDIN
# (PreToolUse tool input is read from stdin — see modules/pre.ts).
set -e

H="${CLAUDE_PLUGIN_ROOT:+$CLAUDE_PLUGIN_ROOT/bin/harness}"
[ -n "$H" ] && [ -x "$H" ] || H="$(command -v harness 2>/dev/null || true)"
[ -n "$H" ] || exit 0

exec "$H" "$@"
