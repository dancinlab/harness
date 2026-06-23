---
description: /lint [all|fast|verbose] — staged-L0 + freshness + CHANGELOG-missing + convergence checks (commit-time gate). Triggers — "린트", "lint", "검사", "/lint".
argument-hint: "[all|fast|verbose]"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar lint $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
