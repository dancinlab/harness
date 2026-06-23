---
description: /install-hooks [--global|--repo] — merge sidecar hooks into ~/.claude/settings.json (global) or repo .claude. Triggers — "훅 설치", "install hooks", "/install-hooks".
argument-hint: "[--global|--repo]"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar install-hooks $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
