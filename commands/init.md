---
description: /init [--force] [--hooks] [--dry-run] — scaffold sidecar into a repo — config + .harness rules + gitignore + wrapper + hooks (strict by default). Triggers — "하네스 설치", "sidecar init", "repo 에 하네스", "scaffold sidecar", "/init".
argument-hint: "[--force] [--hooks] [--dry-run]"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar init $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
