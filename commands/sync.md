---
description: /sync {run|diff} — run the configured shared-file sync script. Triggers — "파일 동기화", "sync run", "shared sync", "/sync".
argument-hint: "{run|diff}"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar sync $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
