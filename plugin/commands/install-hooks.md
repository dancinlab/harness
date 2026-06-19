---
description: /install-hooks [--global|--repo] — merge harness hooks into ~/.claude/settings.json (global) or repo .claude. Triggers — "훅 설치", "install hooks", "/install-hooks".
argument-hint: "[--global|--repo]"
allowed-tools: Bash
---

!`command -v harness >/dev/null 2>&1 && harness install-hooks $ARGUMENTS || echo "harness CLI not found — install dancinlab/harness (~/.harness/cli + ~/.local/bin/harness on PATH)"`
