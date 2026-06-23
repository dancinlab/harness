---
description: /kick <natural-language seed> — runs `hexa kick --seed "<seed>"` via `sidecar kick` (gap-breakthrough · discovery engine, aliased to `hexa drill`). All bare args join into the seed; a leading flag (--rounds N, --engine mk9|mk10) passes through verbatim. Triggers — "kick this", "gap breakthrough on", "discover for", "발산", "돌파해줘", "이거 kick 해", "drill <X>", "/kick".
argument-hint: "<seed expression — natural language allowed>"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar kick $ARGUMENTS || echo "sidecar CLI not found"`
