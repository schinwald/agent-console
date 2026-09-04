#!/usr/bin/env bash

set -euo pipefail

CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(cd "$CURRENT_DIR/.." && pwd)"
ACTIVE_HOOK="$CURRENT_DIR/tmux/tmux-to-backend/on-window-changed.zsh"

# The controller is installed as a launchd daemon; this plugin only wires tmux hooks.
tmux set-environment -g AGENT_CONSOLE_FRONTEND_DIR "$PACKAGE_DIR"
tmux set-environment -g AGENT_CONSOLE_RUN 1
tmux set -g focus-events on
tmux set-hook -gu pane-focus-in
tmux set-hook -g session-window-changed "run-shell -b '$ACTIVE_HOOK'"
tmux set-hook -g client-session-changed "run-shell -b '$ACTIVE_HOOK'"

tmux run-shell -b "$ACTIVE_HOOK"
