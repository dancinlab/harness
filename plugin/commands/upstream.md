---
description: /upstream {list|fix <name|repo>} — in-session upstream (hexa-lang…) fix runbook — fix now, no inbox-only defer. Triggers — "업스트림 수정", "upstream fix", "상위 repo 고쳐", "/upstream".
argument-hint: "{list|fix <name|repo>}"
allowed-tools: Bash
---

!`command -v harness >/dev/null 2>&1 && harness upstream $ARGUMENTS || echo "harness CLI not found — install dancinlab/harness (~/.harness/cli + ~/.local/bin/harness on PATH)"`
