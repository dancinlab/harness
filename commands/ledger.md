---
description: /ledger {register|complete|list|gc|dup_check} — background-agent task ledger (dedupe register). Triggers — "작업 원장", "ledger register", "agent 등록", "/ledger".
argument-hint: "{register|complete|list|gc|dup_check}"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar ledger $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
