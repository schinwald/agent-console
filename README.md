# Agent Console

Agent Console keeps Pi agent metadata, tmux context, and the interactive console synchronized over a local socket.

## Install

Install the frontend (which installs its backend dependency) from the Homebrew tap:

```bash
brew tap schinwald/agent-console
brew install agent-console
```

Start the backend explicitly. Installing the formula does not start a persistent service:

```bash
brew services start agent-console-backend
```

Open the console:

```bash
agent-console
```

## Configure tmux

Add Agent Console to your TPM plugin list in `~/.tmux.conf`:

```tmux
set -g @plugin 'tmux-plugins/tpm'
set -g @plugin 'schinwald/tmux-agent-console'
```

Reload tmux and install the plugin with TPM:

```bash
tmux source-file ~/.tmux.conf
```

Then press `prefix` + `I` in tmux. The plugin enables focus events, installs session/window and client/session change hooks, and performs an initial active-context synchronization.

## Health checks

Confirm the service is running and the backend socket is ready:

```bash
brew services info agent-console-backend
[[ -S "$HOME/Library/Application Support/AgentConsole/communication.sock" ]] && echo communication-ok
```

Confirm tmux integration is installed:

```bash
tmux show-options -g focus-events
tmux show-hook -g session-window-changed
tmux show-hook -g client-session-changed
```

`focus-events on` confirms focus events are enabled. Switch tmux windows or clients, then use `agent-console` to confirm the active agent follows the current tmux context.

## Documentation

- [Architecture](docs/architecture.md)
- [Development](docs/development.md)
- [Debugging](docs/debugging.md)
