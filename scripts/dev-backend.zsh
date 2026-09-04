#!/usr/bin/env zsh

set -euo pipefail

ROOT="${0:A:h:h}"
BACKEND="$ROOT/packages/backend/dist/agent-console-backend"
if [[ ! -x "$BACKEND" ]]; then
  print -u2 "Backend binary is missing; run: pnpm build"
  exit 1
fi

exec "$BACKEND"
