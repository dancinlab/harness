---
description: /pr-cycle [gh flags] — push branch → open PR → self-merge (squash · admin · delete-branch) → local base ff-sync. Doc-gate enforced. Triggers — "PR 돌려", "pr cycle", "머지해줘", "push and merge", "셀프머지", "/pr-cycle".
argument-hint: "[gh flags]"
allowed-tools: Bash
---

!`command -v harness >/dev/null 2>&1 && harness pr-cycle $ARGUMENTS || echo "harness CLI not found — install dancinlab/harness (~/.harness/cli + ~/.local/bin/harness on PATH)"`
