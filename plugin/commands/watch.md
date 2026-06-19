---
description: /watch <url|path> [question] [flags] — download (yt-dlp) → frames (ffmpeg) + transcript (captions/Whisper) so the agent can 'watch' a video/stream. Triggers — "영상 봐줘", "비디오 분석", "watch this video", "analyze this clip", "유튜브 영상 분석", "/watch".
argument-hint: "<url|path> [question] [flags]"
allowed-tools: Bash
---

!`command -v harness >/dev/null 2>&1 && harness watch $ARGUMENTS || echo "harness CLI not found — install dancinlab/harness (~/.harness/cli + ~/.local/bin/harness on PATH)"`
