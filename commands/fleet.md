---
description: /fleet [name:goal,… | go | stop | status] — perpetual multi-lane orchestrator — run several research/build lanes continuously (runbook + roster). Triggers — "플릿", "fleet", "여러 레인", "멀티 레인 오케스트레이션", "/fleet", "함대".
argument-hint: "[name:goal,… | go | stop | status]"
allowed-tools: Bash
---

!`command -v harness >/dev/null 2>&1 && harness fleet $ARGUMENTS || echo "harness CLI not found — install dancinlab/harness (~/.harness/cli + ~/.local/bin/harness on PATH)"`
