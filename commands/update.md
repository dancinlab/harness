---
description: /update [--hooks] — bump the .harness-engine submodule to latest + optional hook refresh. Triggers — "하네스 업데이트", "harness update", "/update".
argument-hint: "[--hooks]"
allowed-tools: Bash
---

!`command -v harness >/dev/null 2>&1 && harness update $ARGUMENTS || echo "harness CLI not found — install dancinlab/harness (~/.harness/cli + ~/.local/bin/harness on PATH)"`
