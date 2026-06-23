---
description: /claudemd {inject|show} — re-inject repo-root CLAUDE.md (project rules) so they stay enforced. Triggers — "CLAUDE.md 주입", "claudemd show", "/claudemd".
argument-hint: "{inject|show}"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar claudemd $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
