---
description: /ci [all|fast|list] — run configured verification commands in parallel (any failure → exit 1). Triggers — "CI 돌려", "테스트 실행", "run ci", "검증 명령", "/ci".
argument-hint: "[all|fast|list]"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar ci $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
