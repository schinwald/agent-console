#!/usr/bin/env zsh

set -euo pipefail

ROOT="${0:A:h:h}"
FRONTEND="$ROOT/packages/frontend/dist/agent-console"
BACKEND="$ROOT/packages/backend/dist/agent-console-backend"
SOCKET="${AGENT_CONSOLE_STATE_DIR:-$HOME/Library/Application Support/AgentConsole}/communication.sock"

[[ -x "$FRONTEND" ]] || { print -u2 "frontend binary missing: $FRONTEND"; exit 1; }
[[ -x "$BACKEND" ]] || { print -u2 "backend binary missing: $BACKEND"; exit 1; }
[[ -S "$SOCKET" ]] || { print -u2 "backend socket missing; run: pnpm dev:backend"; exit 1; }
tmux show-hook -g session-window-changed >/dev/null
tmux show-hook -g client-session-changed >/dev/null
print "dev environment: ready"
