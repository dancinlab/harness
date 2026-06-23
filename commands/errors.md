---
description: /errors {route|list|drain_check|mark_fixed} — error severity classification + queue. Triggers — "에러 큐", "errors list", "오류 분류", "/errors".
argument-hint: "{route|list|drain_check|mark_fixed}"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar errors $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
