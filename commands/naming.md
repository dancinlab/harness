---
description: /naming audit [path] [--ing] [--gate] — repo-wide non-canonical filename auditor. The write-time naming-guard blocks NEW bad names (foo_v2.ts); this scans the whole tracked tree for the backlog (version/copy/dup suffixes already committed) so canonical-naming is enforced across a repo, not just on new writes. `--ing` lands a one-line summary on THIS repo's ING board (boards are my-repo only — no cross-repo). `--gate` exits 1 on any hit (commit/CI gate). Triggers — "네이밍 감사", "naming audit", "파일명 검사", "비표준 이름", "canonical 이름 점검", "/naming".
argument-hint: "audit [path] [--ing] [--gate]"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar naming $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
