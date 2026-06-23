---
description: /pool {list|add|rm|on <h> <cmd>|status|specs [h]} — host roster + remote exec + cores/mem/GPU probe (~/.sidecar/pool.json, global). Triggers — "풀 호스트", "pool status", "원격 실행", "호스트 목록", "/pool".
argument-hint: "{list|add|rm|on <h> <cmd>|status|specs [h]}"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar pool $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
