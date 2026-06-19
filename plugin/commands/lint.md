---
description: /lint [all|fast|verbose] — staged-L0 + freshness + CHANGELOG-missing + convergence checks (commit-time gate). Triggers — "린트", "lint", "검사", "/lint".
argument-hint: "[all|fast|verbose]"
allowed-tools: Bash
---

!`command -v harness >/dev/null 2>&1 && harness lint $ARGUMENTS || echo "harness CLI not found — install dancinlab/harness (~/.harness/cli + ~/.local/bin/harness on PATH)"`
