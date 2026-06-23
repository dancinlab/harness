---
description: /ing [show|add [--to <repo>]|done|next|pod ...|inject] — in-progress board → ING.jsonl (작업·POD·next; done=scrub; cross-repo handoff via --to). For free text with shell-special chars (parens·quotes·$·→) call Bash with the STDIN-safe form `printf '%s' "<text>" | sidecar ing add --stdin` (avoids unquoted-$ARGUMENTS breakage). Triggers — "진행보드", "ING 등록", "작업 남겨놔", "ing add", "인계", "/ing", "ING 에 남겨".
argument-hint: "[show|add [--to <repo>]|done|next|pod ...|inject]"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar ing $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
