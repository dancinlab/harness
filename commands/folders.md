---
description: /folders [scan|scaffold <dir>] — per-subfolder CLAUDE.md coverage check + template scaffolding. Triggers — "폴더 CLAUDE 점검", "folders scan", "서브폴더 문서", "/folders".
argument-hint: "[scan|scaffold <dir>]"
allowed-tools: Bash
---

!`command -v harness >/dev/null 2>&1 && harness folders $ARGUMENTS || echo "harness CLI not found — install dancinlab/harness (~/.harness/cli + ~/.local/bin/harness on PATH)"`
