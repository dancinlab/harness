---
description: /audit [full|summary|json] — 6-axis harness self-scorecard (/60). Triggers — "감사", "스코어카드", "audit", "self-score", "/audit".
argument-hint: "[full|summary|json]"
allowed-tools: Bash
---

!`command -v harness >/dev/null 2>&1 && harness audit $ARGUMENTS || echo "harness CLI not found — install dancinlab/harness (~/.harness/cli + ~/.local/bin/harness on PATH)"`
