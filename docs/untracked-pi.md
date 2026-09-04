# Untracked Pi process recovery

Agent Console logs an `untracked pi processes` warning when a live `pi` PID is absent from `~/.pi/manager/instances.json`. The warning includes its PID and tmux binding when available.

## Recovery

1. Attach to the reported tmux pane.
2. Restart that Pi instance so it loads `pi-agent-lifecycle` at startup.
3. Confirm the PID appears in `~/.pi/manager/instances.json` and Agent Console search.

Inspect lifecycle delivery diagnostics at:

```text
~/.pi/manager/lifecycle.log
```

The log records extension loading, registry updates, and backend socket delivery failures.
