---
description: /bypass — anti-punt self-check runbook — proceed on local+reversible work; ask only when outward-facing or a real decision. Triggers — "우회하지마", "punt 금지", "anti-punt", "그냥 진행", "/bypass".
allowed-tools: Bash
---

!`command -v harness >/dev/null 2>&1 && harness bypass $ARGUMENTS || echo "harness CLI not found — install dancinlab/harness (~/.harness/cli + ~/.local/bin/harness on PATH)"`
