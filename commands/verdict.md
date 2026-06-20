---
description: /verdict {record <id> <cmd>|list|show <id>} — verification-evidence ledger → .verdicts/ (PASS/FAIL, captured command output as proof). Triggers — "판정 기록", "verdict record", "증거 박제", "/verdict".
argument-hint: "{record <id> <cmd>|list|show <id>}"
allowed-tools: Bash
---

!`command -v harness >/dev/null 2>&1 && harness verdict $ARGUMENTS || echo "harness CLI not found — install dancinlab/harness (~/.harness/cli + ~/.local/bin/harness on PATH)"`
