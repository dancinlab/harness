---
description: /changelog {add "<title>"|list [N]|render [N]|prune --keep N|--older-than D|migrate} — append-only history as CHANGELOG.jsonl (newest-first · ts+title+body). add appends(body via stdin), prune deletes old entries, render = markdown view. Triggers — "체인지로그", "changelog 추가", "이력 정리", "오래된 changelog 삭제", "/changelog".
argument-hint: "{add \"<title>\"|list|render|prune --keep N|migrate}"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar changelog $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
