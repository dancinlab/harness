---
description: /pod — GPU cloud pod dispatch runbook — preflight → fire → poll → harvest → down (cost-gated). Triggers — "GPU 포드", "클라우드 GPU", "pod 발사", "rent gpu", "/pod", "포드 띄워".
allowed-tools: Bash
---

!`command -v harness >/dev/null 2>&1 && harness pod $ARGUMENTS || echo "harness CLI not found — install dancinlab/harness (~/.harness/cli + ~/.local/bin/harness on PATH)"`
