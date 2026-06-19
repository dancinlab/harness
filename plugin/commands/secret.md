---
description: /secret <get|set|rotate|list|init|backup|sync> [args] — passthrough to the `secret` CLI (Keychain creds). ⚠ `get` exposes the value in context — prefer inline `$(secret get <k>)` for tool args. Triggers — "시크릿", "secret get", "secret set", "api key 저장", "키 가져와", "/secret".
argument-hint: "<get|set|rotate|list|init|backup|sync> [args]"
allowed-tools: Bash
---

!`command -v harness >/dev/null 2>&1 && harness secret $ARGUMENTS || echo "harness CLI not found — install dancinlab/harness (~/.harness/cli + ~/.local/bin/harness on PATH)"`
