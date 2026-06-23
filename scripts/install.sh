#!/usr/bin/env bash
# dancinlab/sidecar — global bootstrap installer.
#
# Clones (or updates) the sidecar CLI to ~/.sidecar/cli and drops a `sidecar`
# wrapper on PATH (~/.local/bin/sidecar). Idempotent — safe to re-run; a second
# run just fast-forwards the clone. This is the SSOT for `sidecar install`
# (the CLI verb delegates here).
#
# One-liner (no sidecar needed yet):
#   curl -fsSL https://raw.githubusercontent.com/dancinlab/sidecar/main/scripts/install.sh | bash
#
# By default this also wires the sidecar hooks GLOBALLY (install-hooks --global)
# so guards/injects fire in every Claude Code session — a one-shot common setup,
# NOT a per-repo scaffold (that's `sidecar init`).
#
# Env / flag overrides:
#   SIDECAR_DIR / --dir=<path>   install dir   (default ~/.sidecar/cli)
#   SIDECAR_BIN / --bin=<path>   wrapper path  (default ~/.local/bin/sidecar)
#   SIDECAR_REF / --ref=<ref>    branch/tag    (default main)
#   --no-hooks                   skip the global hook wiring (clone + wrapper only)
#   --dry-run                    print actions, change nothing
set -euo pipefail

REPO="https://github.com/dancinlab/sidecar"
DIR="${SIDECAR_DIR:-$HOME/.sidecar/cli}"
BIN="${SIDECAR_BIN:-$HOME/.local/bin/sidecar}"
REF="${SIDECAR_REF:-main}"
DRY=0
HOOKS=1
for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1 ;;
    --no-hooks) HOOKS=0 ;;
    --ref=*) REF="${a#*=}" ;;
    --dir=*) DIR="${a#*=}" ;;
    --bin=*) BIN="${a#*=}" ;;
    *) printf '⚠ unknown flag: %s\n' "$a" >&2 ;;
  esac
done

say() { printf '%s\n' "$*"; }
# run real argv tokens (no eval — avoids nested-quote breakage); dry-run just prints
run() { if [ "$DRY" = 1 ]; then printf '  would: %s\n' "$*"; else "$@"; fi; }

command -v git >/dev/null 2>&1 || { say "✗ git not found — install git first."; exit 1; }

# 1. clone or update the engine clone
if [ -d "$DIR/.git" ]; then
  say "↻ updating $DIR (ref $REF)"
  run git -C "$DIR" fetch -q origin
  run git -C "$DIR" checkout -q "$REF"
  run git -C "$DIR" reset -q --hard "origin/$REF"
else
  say "⬇ cloning $REPO → $DIR (ref $REF)"
  run mkdir -p "$(dirname "$DIR")"
  run git clone -q --branch "$REF" "$REPO" "$DIR"
fi

# 2. wrapper on PATH — a SCRIPT, not a symlink: bin/sidecar resolves its own dir
#    via BASH_SOURCE without readlink, so a symlink at $BIN would mis-resolve the
#    install dir. A thin exec-wrapper always points at the real launcher.
say "🔗 linking $BIN → $DIR/bin/sidecar"
if [ "$DRY" = 1 ]; then
  say "  would: write exec-wrapper to $BIN"
else
  mkdir -p "$(dirname "$BIN")"
  cat > "$BIN" <<EOF
#!/usr/bin/env bash
exec bash "$DIR/bin/sidecar" "\$@"
EOF
  chmod +x "$BIN"
fi

# 3. PATH check
BINDIR="$(dirname "$BIN")"
case ":${PATH:-}:" in
  *":$BINDIR:"*) say "✓ $BINDIR is on PATH" ;;
  *) say "⚠ $BINDIR is NOT on PATH — add to your shell rc (~/.zshrc / ~/.bashrc):"
     say "    export PATH=\"$BINDIR:\$PATH\"" ;;
esac

# 4. smoke (best-effort; needs a tsx/npx runtime — bin/sidecar auto-resolves it)
if [ "$DRY" = 0 ]; then
  if bash "$DIR/bin/sidecar" help >/dev/null 2>&1; then
    say "✓ sidecar runs"
  else
    say "⚠ installed, but the 'help' smoke did not pass — likely a tsx/npx runtime hiccup."
    say "  check: bash $DIR/bin/sidecar help"
  fi
fi

# 5. global hook wiring — the "common setup" step (skip with --no-hooks)
if [ "$HOOKS" = 1 ]; then
  say "🪝 wiring sidecar hooks globally (~/.claude/settings.json)"
  if [ "$DRY" = 1 ]; then
    say "  would: sidecar install-hooks --global"
  else
    bash "$DIR/bin/sidecar" install-hooks --global || say "⚠ hook wiring failed — run later: sidecar install-hooks --global"
  fi
fi

say ""
say "✅ sidecar installed → $DIR  (common/global setup$([ "$HOOKS" = 1 ] && echo ' + hooks' || echo ''))"
say "   per-repo scaffold (optional): cd <repo> && sidecar init"
say "   update later:                 sidecar self-update"
