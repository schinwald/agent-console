# Development

Run commands from the repository root.

## Start local development

```bash
pnpm dev:setup
```

`dev:setup` builds all packages, installs the tmux hooks, and triggers an initial active-window synchronization. Then start the backend:

```bash
pnpm dev:backend
```

The default socket is:

```text
~/Library/Application Support/AgentConsole/communication.sock
```

Check readiness:

```bash
pnpm dev:check
```

Start the interactive frontend in another terminal:

```bash
pnpm dev:frontend
```

## tmux integration

Install or re-install the tmux plugin for the current tmux server:

```bash
bash packages/frontend/src/agent-console-frontend.tmux
```

The plugin enables `focus-events`, registers `session-window-changed` and `client-session-changed` hooks, then runs an initial synchronization.

Each hook runs the installed backend hook binary when available:

```text
~/.local/share/agent-console/current/libexec/agent-console-backend-tmux-hook
```

Otherwise it runs `packages/backend/src/tmux-hook.ts` through `pnpm tsx`. Override either lookup with:

```bash
export AGENT_CONSOLE_BACKEND_HOOK=/path/to/agent-console-backend-tmux-hook
export PI_MANAGER_PNPM=/path/to/pnpm
```

## Pi lifecycle events

After changing the Pi extension, reload Pi:

```text
/reload
```

New Pi sessions emit `agent.created`. The backend registers the agent, reconciles tmux bindings, and marks it active when it matches the current tmux context.

## Verification

Check the socket:

```bash
[[ -S "$HOME/Library/Application Support/AgentConsole/communication.sock" ]] && echo communication-ok
```

Check tmux hooks:

```bash
tmux show-options -g focus-events
tmux show-hook -g session-window-changed
tmux show-hook -g client-session-changed
```

Expected:

```text
focus-events on
```

Check development binaries:

```bash
pgrep -af 'agent-console-backend|agent-console'
```

## Configuration

Override the backend socket or registry:

```bash
export PI_MANAGER_SOCKET=/path/to/communication.sock
export PI_MANAGER_REGISTRY=/path/to/instances.json
```

## Released installs

Development scripts start binaries directly. In a released Homebrew install, Homebrew owns persistent service management:

```bash
brew services start agent-console-backend
```

The tmux hooks remain safe to re-run.
