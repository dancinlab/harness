---
description: /imagine <prompt-file> <out.png> [-s size] [-b fal|openai] [-m model] | list | help | history — generic AI image generator (fal default / openai). Keys via `secret get`; prompt read from a FILE (no argv leak); canonical sizes square_hd/landscape_16_9/portrait_16_9/square. Triggers — "이미지 생성", "이미지 만들어", "그림 그려줘", "표지 만들어", "generate an image", "draw a cover", "make a teaser", "fal.ai image".
argument-hint: "<prompt-file> <out.png> [-s size] [-b fal|openai] [-m model] | list | help | history"
allowed-tools: Bash
---

!`command -v harness >/dev/null 2>&1 && harness imagine $ARGUMENTS || echo "harness CLI not found — install dancinlab/harness (~/.harness/cli + ~/.local/bin/harness on PATH)"`
