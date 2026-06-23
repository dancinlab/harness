---
description: /verdict {record <id> <cmd>|list|show <id>} — verification-evidence ledger → .verdicts/ (PASS/FAIL, captured command output as proof). Triggers — "판정 기록", "verdict record", "증거 박제", "/verdict".
argument-hint: "{record <id> <cmd>|list|show <id>}"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar verdict $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
