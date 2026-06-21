---
description: /load {show|inject} — per-turn macOS resource readout (CPU load + RAM pressure/used% + swap, ⚠️ on danger). Triggers — "부하", "맥 부하", "메모리 압박", "load", "/load".
argument-hint: "{show|inject}"
allowed-tools: Bash
---

!`command -v harness >/dev/null 2>&1 && harness load $ARGUMENTS || echo "harness CLI not found — install dancinlab/harness (~/.harness/cli + ~/.local/bin/harness on PATH)"`
