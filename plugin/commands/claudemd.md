---
description: /claudemd {inject|show} — re-inject repo-root CLAUDE.md (project rules) so they stay enforced. Triggers — "CLAUDE.md 주입", "claudemd show", "/claudemd".
argument-hint: "{inject|show}"
allowed-tools: Bash
---

!`command -v harness >/dev/null 2>&1 && harness claudemd $ARGUMENTS || echo "harness CLI not found — install dancinlab/harness (~/.harness/cli + ~/.local/bin/harness on PATH)"`
