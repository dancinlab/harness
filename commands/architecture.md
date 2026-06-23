---
description: /architecture {inject|show} — surface repo-root ARCHITECTURE.json/.md (design SSOT) like CLAUDE.md. Triggers — "아키텍처 주입", "architecture show", "설계 SSOT", "/architecture".
argument-hint: "{inject|show}"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar architecture $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
