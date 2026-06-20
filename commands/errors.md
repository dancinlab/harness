---
description: /errors {route|list|drain_check|mark_fixed} — error severity classification + queue. Triggers — "에러 큐", "errors list", "오류 분류", "/errors".
argument-hint: "{route|list|drain_check|mark_fixed}"
allowed-tools: Bash
---

!`command -v harness >/dev/null 2>&1 && harness errors $ARGUMENTS || echo "harness CLI not found — install dancinlab/harness (~/.harness/cli + ~/.local/bin/harness on PATH)"`
