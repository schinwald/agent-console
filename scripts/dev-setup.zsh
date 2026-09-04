#!/usr/bin/env zsh

set -euo pipefail

ROOT="${0:A:h:h}"

(cd "$ROOT" && pnpm build)
bash "$ROOT/packages/frontend/src/agent-console-frontend.tmux"
print "Setup complete. Start backend with: pnpm dev:backend"
