---
description: /verify [rubric | fence "<claim>"] — tier-rubric claim verification — colored g5 badges, no LLM self-judge. Triggers — "검증", "claim 검증", "verify claim", "tier 판정", "/verify", "팩트체크".
argument-hint: "[rubric | fence '<claim>']"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar verify $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
