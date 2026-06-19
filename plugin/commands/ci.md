---
description: /ci [all|fast|list] — run configured verification commands in parallel (any failure → exit 1). Triggers — "CI 돌려", "테스트 실행", "run ci", "검증 명령", "/ci".
argument-hint: "[all|fast|list]"
allowed-tools: Bash
---

!`command -v harness >/dev/null 2>&1 && harness ci $ARGUMENTS || echo "harness CLI not found — install dancinlab/harness (~/.harness/cli + ~/.local/bin/harness on PATH)"`
