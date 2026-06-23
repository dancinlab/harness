---
description: /lsp {wire|status|rebuild <file>} — editor LSP wiring (.lsp.json) + background rebuild of prebuilt hexa LSP binaries when grammar source changes. Triggers — "lsp 배선", "lsp 상태", "rebuild lsp", "/lsp wire", "/lsp status".
argument-hint: "{wire|status|rebuild <file>}"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar lsp $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
