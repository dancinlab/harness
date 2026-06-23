---
description: /afg [labels] — all-fg-go — run the prior turn’s proposed branches SEQUENTIALLY in-session (foreground). Triggers — "전부 포그라운드", "순차 실행", "all foreground", "afg", "하나씩 진행", "/afg", "/all-fg-go".
argument-hint: "[labels]"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar afg $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
