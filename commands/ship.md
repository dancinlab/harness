---
description: /ship [--no-doc] — one-shot propagate an implementation to EVERY sidecar install surface in the one correct order: pr-cycle (doc-gate → push → PR → verified merge → local main sync) → self-update (git-pull the global CLI ~/.sidecar/cli) → shadow (re-mirror commands/ → ~/.claude/commands/ so new slash commands appear). Prevents the recurring gap where a change merges but a new slash command stays invisible because the shadow mirror was never refreshed. Run after every implementation. Triggers — "ship", "배포", "전파", "구현 끝 ship", "/ship".
argument-hint: "[--no-doc]"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar ship $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
