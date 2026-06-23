---
description: /folders [scan|scaffold <dir>] — per-subfolder CLAUDE.md coverage check + template scaffolding. Triggers — "폴더 CLAUDE 점검", "folders scan", "서브폴더 문서", "/folders".
argument-hint: "[scan|scaffold <dir>]"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar folders $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
