---
description: /lockdown {status|add <path...>|rm <path...>|check <path>} — manage the L0 lockdown set (opt-in core-file edit guard). Triggers — "잠금 파일", "lockdown add", "L0 보호", "/lockdown".
argument-hint: "{status|add <path...>|rm <path...>|check <path>}"
allowed-tools: Bash
---

!`command -v harness >/dev/null 2>&1 && harness lockdown $ARGUMENTS || echo "harness CLI not found — install dancinlab/harness (~/.harness/cli + ~/.local/bin/harness on PATH)"`
