---
description: /architecture {inject|show} — surface repo-root ARCHITECTURE.json/.md (design SSOT) like CLAUDE.md. Triggers — "아키텍처 주입", "architecture show", "설계 SSOT", "/architecture".
argument-hint: "{inject|show}"
allowed-tools: Bash
---

!`command -v harness >/dev/null 2>&1 && harness architecture $ARGUMENTS || echo "harness CLI not found — install dancinlab/harness (~/.harness/cli + ~/.local/bin/harness on PATH)"`
