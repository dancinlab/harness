---
description: /recommend {inject|show|get-default|set-default <m> [--global]|clear-default [--global]|resolve-mode <a>} — 4-axis recommendation rubric + default mode (present/auto/complete/simple/safe/std). Triggers — "추천 모드", "recommend set-default", "4축 추천", "기본 축 설정", "/recommend".
argument-hint: "{inject|show|get-default|set-default <m> [--global]|clear-default [--global]|resolve-mode <a>}"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar recommend $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
