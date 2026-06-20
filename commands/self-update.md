---
description: /self-update — git-pull the harness CLI clone this binary runs from (~/.harness/cli) to latest main. Triggers — "하네스 자체 업데이트", "self-update", "harness 최신화", "/self-update".
allowed-tools: Bash
---

!`command -v harness >/dev/null 2>&1 && harness self-update $ARGUMENTS || echo "harness CLI not found — install dancinlab/harness (~/.harness/cli + ~/.local/bin/harness on PATH)"`
