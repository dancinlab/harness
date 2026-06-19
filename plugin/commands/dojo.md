---
description: /dojo [<slug>] [--lang] — cloud training-job scaffolder (runbook + exports/dojo/<slug>/ emit). Triggers — "학습잡", "training job", "dojo", "모델 학습 스캐폴드", "/dojo".
argument-hint: "[<slug>] [--lang]"
allowed-tools: Bash
---

!`command -v harness >/dev/null 2>&1 && harness dojo $ARGUMENTS || echo "harness CLI not found — install dancinlab/harness (~/.harness/cli + ~/.local/bin/harness on PATH)"`
