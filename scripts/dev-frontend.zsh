#!/usr/bin/env zsh

set -euo pipefail

ROOT="${0:A:h:h}"
FRONTEND="$ROOT/packages/frontend/dist/agent-console"
if [[ ! -x "$FRONTEND" ]]; then
  print -u2 "Frontend binary is missing; run: pnpm build"
  exit 1
fi

exec "$FRONTEND" "$@"
