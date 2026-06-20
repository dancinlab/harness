---
description: /pool {list|add|rm|on <h> <cmd>|status|specs [h]} — host roster + remote exec + cores/mem/GPU probe (~/.harness/pool.json, global). Triggers — "풀 호스트", "pool status", "원격 실행", "호스트 목록", "/pool".
argument-hint: "{list|add|rm|on <h> <cmd>|status|specs [h]}"
allowed-tools: Bash
---

!`command -v harness >/dev/null 2>&1 && harness pool $ARGUMENTS || echo "harness CLI not found — install dancinlab/harness (~/.harness/cli + ~/.local/bin/harness on PATH)"`
