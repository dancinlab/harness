---
description: /init [--force] [--hooks] [--dry-run] — scaffold harness into a repo — config + .harness rules + gitignore + wrapper + hooks (strict by default). Triggers — "하네스 설치", "harness init", "repo 에 하네스", "scaffold harness", "/init".
argument-hint: "[--force] [--hooks] [--dry-run]"
allowed-tools: Bash
---

!`command -v harness >/dev/null 2>&1 && harness init $ARGUMENTS || echo "harness CLI not found — install dancinlab/harness (~/.harness/cli + ~/.local/bin/harness on PATH)"`
