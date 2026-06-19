---
description: /uninstall [--dry-run] [--keep-logs] — remove harness-injected files (config/.harness/hooks/wrapper); keeps user content. Triggers — "하네스 제거", "uninstall harness", "/uninstall".
argument-hint: "[--dry-run] [--keep-logs]"
allowed-tools: Bash
---

!`command -v harness >/dev/null 2>&1 && harness uninstall $ARGUMENTS || echo "harness CLI not found — install dancinlab/harness (~/.harness/cli + ~/.local/bin/harness on PATH)"`
