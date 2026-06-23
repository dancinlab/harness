---
description: /lockdown {status|add <path...>|rm <path...>|check <path>} — manage the L0 lockdown set (opt-in core-file edit guard). Triggers — "잠금 파일", "lockdown add", "L0 보호", "/lockdown".
argument-hint: "{status|add <path...>|rm <path...>|check <path>}"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar lockdown $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
