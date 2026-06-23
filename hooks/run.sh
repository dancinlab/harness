#!/usr/bin/env bash
# sidecar plugin hook dispatcher — single resolution point for the sidecar CLI.
#
# Self-contained-first: prefer the plugin's OWN bundled CLI (${CLAUDE_PLUGIN_ROOT}/bin/sidecar),
# so a `/plugin update` + reload refreshes the CLI together with hooks/commands — no separate
# `sidecar self-update`. Falls back to a global `sidecar` on PATH (the classic ~/.sidecar/cli
# install), and stays silent (exit 0) if neither exists, so a host without sidecar never errors.
#
# CC pipes the hook payload on this process's STDIN; we exec the CLI so it inherits that STDIN
# (PreToolUse tool input is read from stdin — see modules/pre.ts).
set -e

H="${CLAUDE_PLUGIN_ROOT:+$CLAUDE_PLUGIN_ROOT/bin/sidecar}"
[ -n "$H" ] && [ -x "$H" ] || H="$(command -v sidecar 2>/dev/null || true)"
[ -n "$H" ] || exit 0

exec "$H" "$@"
