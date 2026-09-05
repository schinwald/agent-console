# Debugging

## Service

Install and start explicitly:

```bash
brew install schinwald/agent-console/agent-console-backend
brew services start agent-console-backend
brew services info agent-console-backend
```

## Tmux bindings

A binding is derived from `tmux list-panes`: Agent Console compares each Pi agent PID's parent chain with the pane shell PID, then stores `agent ID -> session/window/pane` in memory. Confirm the tmux server socket and pane list:

```bash
tmux display-message -p '#{socket_path}'
tmux list-panes -a -F '#{pane_pid}\t#{session_name}\t#{window_id}\t#{pane_id}'
```

## Logging

Set `AGENT_CONSOLE_LOG_LEVEL=debug` in the launchd service environment, restart the service, then inspect:

```bash
tail -f /opt/homebrew/var/log/agent-console-backend.error.log
```

Debug records include tmux socket, raw pane command output, parsed panes, agent PIDs, and bindings. `brew services restart` regenerates its launchd plist, so temporary plist edits must be reapplied; do not treat them as persistent configuration.

## TPM hooks

The `schinwald/tmux-agent-console` TPM plugin sends tmux active-context updates. Install with TPM (`prefix` + `I`), then reload tmux config. Its sync script resolves Homebrew's backend hook automatically.

## Release checks

Run backend tests before tagging:

```bash
pnpm --filter @agent-console/backend test
```

After release, update the Homebrew backend formula URL/checksum, upgrade the formula, restart the service, trigger the TPM sync hook, and query the backend socket for `tmuxSession`, `tmuxWindow`, and `tmuxPane`.
