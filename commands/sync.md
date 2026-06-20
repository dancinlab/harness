---
description: /sync {run|diff} — run the configured shared-file sync script. Triggers — "파일 동기화", "sync run", "shared sync", "/sync".
argument-hint: "{run|diff}"
allowed-tools: Bash
---

!`command -v harness >/dev/null 2>&1 && harness sync $ARGUMENTS || echo "harness CLI not found — install dancinlab/harness (~/.harness/cli + ~/.local/bin/harness on PATH)"`
