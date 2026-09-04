#!/usr/bin/env zsh

set -euo pipefail

# Active-window synchronization is implemented by the backend package.
ROOT="${0:A:h:h:h:h:h:h}"
BACKEND_HOOK="${AGENT_CONSOLE_BACKEND_HOOK:-$HOME/.local/share/agent-console/current/libexec/agent-console-backend-tmux-hook}"

if [[ -x "$BACKEND_HOOK" ]]; then
  exec "$BACKEND_HOOK"
fi

PNPM_BIN="${PI_MANAGER_PNPM:-$(command -v pnpm 2>/dev/null || true)}"
[[ -x "$PNPM_BIN" ]] || exit 127
exec "$PNPM_BIN" tsx "$ROOT/packages/backend/src/tmux-hook.ts"
