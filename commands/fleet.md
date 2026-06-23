---
description: /fleet [name:goal,… | go | stop | status] — perpetual multi-lane orchestrator — run several research/build lanes continuously (runbook + roster). Triggers — "플릿", "fleet", "여러 레인", "멀티 레인 오케스트레이션", "/fleet", "함대".
argument-hint: "[name:goal,… | go | stop | status]"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar fleet $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
