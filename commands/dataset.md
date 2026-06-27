---
description: /dataset {list|show|add|set|feat|rm} [--lang ko|en] [--register general|sns] — dataset registry → repo-root ARCHITECTURE.json `.datasets[]` (single-doc SSOT, parallel to models; byte-invariant top-level splice). Triggers — "데이터셋 등록", "dataset list", "코퍼스 레지스트리", "/dataset".
argument-hint: "{list|show|add|set|feat|rm} [--lang ko|en] [--register general|sns]"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar dataset $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
