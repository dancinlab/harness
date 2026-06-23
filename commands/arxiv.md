---
description: Search the arXiv API by free-text query, or look up a paper by arXiv id. Returns title / authors / date / categories / pdf link / abstract for each result. No API key needed. Triggers — "arxiv 검색", "논문 찾아줘", "arxiv 에서 종결됐는지", "is this on arxiv", "search arxiv", "fetch paper", "/arxiv".
argument-hint: "<query | arxiv-id> [--n N] [--sort relevance|date|updated]"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar research arxiv $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
