---
description: /load {show|inject} — per-turn macOS resource readout (CPU load + RAM pressure/used% + swap, ⚠️ on danger). Triggers — "부하", "맥 부하", "메모리 압박", "load", "/load".
argument-hint: "{show|inject}"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar load $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
