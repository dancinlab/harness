---
description: /bypass — anti-punt self-check runbook — proceed on local+reversible work; ask only when outward-facing or a real decision. Triggers — "우회하지마", "punt 금지", "anti-punt", "그냥 진행", "/bypass".
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar bypass $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
